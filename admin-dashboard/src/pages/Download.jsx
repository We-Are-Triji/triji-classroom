import { useEffect, useState } from 'react';
import { AlertCircle, Download as DownloadIcon, RefreshCw, WifiOff } from 'lucide-react';

const GITHUB_REPO = 'gauciv/triji-app';
const APK_URL =
  import.meta.env.VITE_APK_URL ||
  'https://github.com/gauciv/triji-app/releases/download/v1.6.0/triji-app.apk';
const FETCH_TIMEOUT = 10_000;
const MAX_RETRIES = 3;

function sanitizeVersion(version) {
  if (typeof version !== 'string') {
    return 'Latest release';
  }

  return version.replace(/[^a-zA-Z0-9.-]/g, '').slice(0, 20) || 'Latest release';
}

function parseReleaseNotes(body) {
  if (typeof body !== 'string') {
    return [];
  }

  return body
    .slice(0, 5000)
    .split('\n')
    .map(line =>
      line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/[^\s)]+/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/^[\s-*+]+/, '')
        .replace(/^\d+\.\s*/, '')
        .trim()
    )
    .filter(line => line && !line.startsWith('#'))
    .slice(0, 6);
}

function formatFileSize(bytes) {
  if (!bytes || typeof bytes !== 'number') {
    return null;
  }

  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDownloadCount(count) {
  if (!count || typeof count !== 'number') {
    return '0';
  }

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }

  return String(count);
}

function getErrorMessage(error) {
  switch (error) {
    case 'rate-limit':
      return 'GitHub rate-limited the release lookup for a moment.';
    case 'timeout':
      return 'The release check timed out. Your connection may be unstable.';
    case 'offline':
      return 'You appear to be offline, so we can only show the direct APK link.';
    case 'no-releases':
      return 'No published releases were found yet.';
    default:
      return 'We could not load the latest release details.';
  }
}

const Download = () => {
  const [releaseInfo, setReleaseInfo] = useState(null);
  const [downloadStats, setDownloadStats] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchReleaseInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const [latestReleaseResponse, releasesResponse] = await Promise.all([
          fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
            signal: controller.signal,
            headers: { Accept: 'application/vnd.github.v3+json' },
          }),
          fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
            signal: controller.signal,
            headers: { Accept: 'application/vnd.github.v3+json' },
          }),
        ]);

        window.clearTimeout(timeoutId);

        if (!latestReleaseResponse.ok) {
          if (latestReleaseResponse.status === 404) {
            throw new Error('no-releases');
          }
          if (latestReleaseResponse.status === 403) {
            throw new Error('rate-limit');
          }
          throw new Error('fetch-failed');
        }

        const latestRelease = await latestReleaseResponse.json();
        const allReleases = releasesResponse.ok ? await releasesResponse.json() : [];

        if (cancelled) {
          return;
        }

        const apkAssets = Array.isArray(allReleases)
          ? allReleases.flatMap(release =>
              (release.assets || []).filter(asset => asset.name?.toLowerCase().endsWith('.apk'))
            )
          : [];

        const totalDownloads = apkAssets.reduce(
          (total, asset) => total + Number(asset.download_count || 0),
          0
        );
        const latestApk = (latestRelease.assets || []).find(asset =>
          asset.name?.toLowerCase().endsWith('.apk')
        );

        setReleaseInfo({
          version: sanitizeVersion(latestRelease.tag_name),
          notes: parseReleaseNotes(latestRelease.body),
          publishedAt: latestRelease.published_at,
        });
        setDownloadStats({
          totalDownloads,
          fileName: latestApk?.name || 'triji-app.apk',
        });
        setFileSize(formatFileSize(latestApk?.size));
      } catch (requestError) {
        console.error('Failed to fetch release info:', requestError);

        if (!navigator.onLine) {
          setError('offline');
        } else if (requestError.name === 'AbortError') {
          setError('timeout');
        } else if (requestError.message === 'rate-limit') {
          setError('rate-limit');
        } else if (requestError.message === 'no-releases') {
          setError('no-releases');
        } else {
          setError('fetch-failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReleaseInfo();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const handleDownload = () => {
    setDownloading(true);

    const isRemoteAsset = APK_URL.startsWith('http://') || APK_URL.startsWith('https://');

    if (isRemoteAsset) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = APK_URL;
      document.body.appendChild(iframe);
      window.setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2500);
    } else {
      const link = document.createElement('a');
      link.href = APK_URL;
      link.download = 'triji-app.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    window.setTimeout(() => {
      setDownloading(false);
    }, 900);
  };

  return (
    <div className="download-shell">
      <div className="download-grid">
        <section className="poster-panel brutal-card">
          <p className="eyebrow">Mobile app access</p>
          <h1 className="download-title">Install Triji on Android without digging through old release pages.</h1>
          <p className="download-copy">
            This public page keeps the install flow clean while the admin dashboard stays private.
            Download the latest APK, skim the release notes, and head into the mobile experience.
          </p>

          <div className="download-chip-row">
            <span className="hero-chip">Android-first release channel</span>
            <span className="hero-chip">Built from the same monorepo</span>
          </div>

          <div className="poster-notes">
            <div className="poster-note">
              <strong>Simple install path</strong>
              <span>One tap to download, then enable installs from unknown sources if Android asks.</span>
            </div>
            <div className="poster-note">
              <strong>Shared release truth</strong>
              <span>Version, size, and notes are pulled from the same GitHub release feed.</span>
            </div>
          </div>
        </section>

        <section className="download-panel brutal-card">
          <p className="eyebrow">Latest package</p>
          <h2 className="login-title">Download the app</h2>
          <p className="helper-copy">
            Perfect for testers, student officers, or anyone who needs the Android build before the next OTA-only change.
          </p>

          {loading ? (
            <div className="skeleton-grid">
              <div className="skeleton-card">
                <div className="skeleton-line short" />
                <div className="skeleton-line medium" />
                <div className="skeleton-line" />
              </div>
            </div>
          ) : (
            <>
              {releaseInfo ? (
                <div className="download-chip-row">
                  <span className="hero-chip">{releaseInfo.version}</span>
                  {downloadStats ? (
                    <span className="hero-chip">{formatDownloadCount(downloadStats.totalDownloads)} installs</span>
                  ) : null}
                  {fileSize ? <span className="hero-chip">{fileSize}</span> : null}
                </div>
              ) : null}

              {error ? (
                <div className="feedback-box" style={{ marginBottom: 16 }}>
                  {error === 'offline' ? <WifiOff size={16} /> : <AlertCircle size={16} />}
                  <span style={{ marginLeft: 8 }}>{getErrorMessage(error)}</span>
                </div>
              ) : null}

              <div className="download-stats">
                <div className="download-stat">
                  <strong>{releaseInfo?.version || 'APK'}</strong>
                  <span>Release tag</span>
                </div>
                <div className="download-stat">
                  <strong>{fileSize || 'Live'}</strong>
                  <span>Package size</span>
                </div>
                <div className="download-stat">
                  <strong>{downloadStats ? formatDownloadCount(downloadStats.totalDownloads) : '0'}</strong>
                  <span>Total downloads</span>
                </div>
              </div>

              <button className="action-button" onClick={handleDownload} disabled={downloading}>
                <DownloadIcon size={18} />
                <span>{downloading ? 'Starting download…' : 'Download Android APK'}</span>
              </button>

              {(error === 'timeout' || error === 'fetch-failed' || error === 'offline') &&
              retryCount < MAX_RETRIES ? (
                <div style={{ marginTop: 12 }}>
                  <button className="ghost-button" onClick={() => setRetryCount(count => count + 1)}>
                    <RefreshCw size={16} />
                    <span>Retry release lookup</span>
                  </button>
                </div>
              ) : null}

              {releaseInfo?.notes?.length ? (
                <div className="content-panel" style={{ marginTop: 18 }}>
                  <p className="eyebrow">What&apos;s new</p>
                  <ul className="release-list">
                    {releaseInfo.notes.map(note => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="content-panel" style={{ marginTop: 18 }}>
                <p className="eyebrow">Install note</p>
                <p className="row-copy">
                  Android may ask for permission to install from unknown sources. iOS is not currently supported by this download page.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Download;
