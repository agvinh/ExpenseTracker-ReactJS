using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using Tesseract;

namespace ExpenseTracker.Api.Services;

/// <summary>
/// Represents a pool for <see cref="TesseractEngine"/> instances to avoid
/// expensive re-initialization and to limit concurrent OCR engine usage.
/// Each <see cref="TesseractEngine"/> is NOT thread-safe, therefore
/// an engine must only be used by a single thread at a time.
/// </summary>
public interface ITesseractEnginePool
{
    /// <summary>
    /// Rents (acquires) a <see cref="TesseractEngine"/> from the pool.
    /// Will block (up to configured timeout) if the maximum number of engines are in use.
    /// </summary>
    /// <param name="cancellationToken">
    /// Token to cancel the wait for an available engine. If cancelled, an <see cref="OperationCanceledException"/> is thrown.
    /// </param>
    /// <returns>
    /// A <see cref="TesseractEngineRent"/> wrapper which must be disposed to return the engine to the pool.
    /// </returns>
    /// <exception cref="TimeoutException">Thrown when waiting exceeds the configured timeout (<c>OcrOptions.RentTimeoutMs</c>).</exception>
    /// <exception cref="ObjectDisposedException">Thrown if the pool has been disposed.</exception>
    TesseractEngineRent Rent(CancellationToken cancellationToken = default);
}

/// <summary>
/// Disposable rental handle for a pooled <see cref="TesseractEngine"/>.
/// Disposing this object returns the engine to the pool.
/// </summary>
public sealed class TesseractEngineRent : IDisposable
{
    private readonly TesseractEngine _engine;
    private readonly Action<TesseractEngine> _return;
    private bool _disposed;

    internal TesseractEngineRent(TesseractEngine engine, Action<TesseractEngine> @return)
    {
        _engine = engine;
        _return = @return;
    }

    /// <summary>
    /// Gets the underlying rented <see cref="TesseractEngine"/>.
    /// </summary>
    /// <exception cref="ObjectDisposedException">Thrown if accessed after disposal.</exception>
    public TesseractEngine Engine => !_disposed ? _engine : throw new ObjectDisposedException(nameof(TesseractEngineRent));

    /// <summary>
    /// Returns the engine to the pool. Multiple calls are ignored.
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _return(_engine);
    }
}

/// <summary>
/// Default implementation of <see cref="ITesseractEnginePool"/> using a <see cref="SemaphoreSlim"/>
/// to cap concurrent engine usage and a <see cref="ConcurrentBag{T}"/> to store idle engines.
/// Engines are created lazily up to <c>MaxEngines</c>.
/// </summary>
public class TesseractEnginePool : ITesseractEnginePool, IDisposable
{
    private readonly ConcurrentBag<TesseractEngine> _pool = new();
    private readonly SemaphoreSlim _semaphore;
    private readonly string _tessdataPath;
    private readonly string _languages;
    private readonly int _maxEngines;
    private readonly int _rentTimeoutMs;
    private bool _disposed;
    private readonly ILogger<TesseractEnginePool> _logger;

    /// <summary>
    /// Creates a new pool instance using OCR configuration and hosting environment for path resolution.
    /// </summary>
    /// <param name="opts">OCR options containing tessdata path, languages, pool limits, timeout.</param>
    /// <param name="env">Host environment to resolve relative tessdata paths.</param>
    /// <param name="logger">Logger for diagnostics.</param>
    public TesseractEnginePool(IOptions<OcrOptions> opts, IWebHostEnvironment env, ILogger<TesseractEnginePool> logger)
    {
        _logger = logger;
        var options = opts.Value;
        _maxEngines = Math.Max(1, options.MaxEngines);
        _rentTimeoutMs = options.RentTimeoutMs <= 0 ? 5000 : options.RentTimeoutMs;
        _tessdataPath = Path.IsPathRooted(options.TessdataPath)
            ? options.TessdataPath
            : Path.Combine(env.ContentRootPath, options.TessdataPath);
        _languages = options.Languages;
        _semaphore = new SemaphoreSlim(_maxEngines, _maxEngines);
    }

    /// <inheritdoc />
    public TesseractEngineRent Rent(CancellationToken cancellationToken = default)
    {
        EnsureNotDisposed();

        try
        {
            // Wait for an available slot (engine) respecting timeout & cancellation.
            if (!_semaphore.Wait(_rentTimeoutMs, cancellationToken))
            {
                _logger.LogWarning("Timeout ({Timeout}ms) waiting for TesseractEngine (MaxEngines={Max})",
                    _rentTimeoutMs, _maxEngines);
                throw new TimeoutException($"Timeout waiting for a TesseractEngine after {_rentTimeoutMs}ms");
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Rent operation cancelled by token");
            throw;
        }

        EnsureNotDisposed();

        if (_pool.TryTake(out var engine))
        {
            _logger.LogDebug("Reusing TesseractEngine from pool");
            return new TesseractEngineRent(engine, ReturnInternal);
        }

        // Lazily create a new engine if none idle and we still have capacity (semaphore already restricts usage).
        _logger.LogInformation("Creating new TesseractEngine (Current +1 <= {Max})", _maxEngines);
        var created = new TesseractEngine(_tessdataPath, _languages, EngineMode.Default);
        return new TesseractEngineRent(created, ReturnInternal);
    }

    /// <summary>
    /// Throws if the pool has been disposed.
    /// </summary>
    private void EnsureNotDisposed()
    {
        if (_disposed) throw new ObjectDisposedException(nameof(TesseractEnginePool));
    }

    /// <summary>
    /// Returns an engine to the idle pool or disposes it if the pool is shutting down.
    /// </summary>
    /// <param name="engine">Engine instance to return.</param>
    private void ReturnInternal(TesseractEngine engine)
    {
        if (_disposed)
        {
            engine.Dispose();
            _semaphore.Release();
            return;
        }
        _pool.Add(engine);
        _semaphore.Release();
    }

    /// <summary>
    /// Disposes the pool and all idle engines. Engines currently rented will be disposed
    /// when returned (since <see cref="_disposed"/> becomes true).
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        while (_pool.TryTake(out var eng))
        {
            try { eng.Dispose(); } catch { /* ignore */ }
        }
        _semaphore.Dispose();
    }
}
