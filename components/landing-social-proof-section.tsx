"use client";

import { useEffect, useRef } from "react";

const videoSource =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4";

const brands = ["Vortex", "Nimbus", "Prysma", "Cirrus", "Kynder", "Halcyn"];

export function LandingSocialProofSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const restartTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let frameId = 0;
    let cancelled = false;

    const updateOpacity = () => {
      if (cancelled) {
        return;
      }

      const { currentTime, duration } = video;
      if (Number.isFinite(duration) && duration > 0) {
        const fadeWindow = 0.5;
        let nextOpacity = 1;

        if (currentTime <= fadeWindow) {
          nextOpacity = currentTime / fadeWindow;
        } else if (duration - currentTime <= fadeWindow) {
          nextOpacity = Math.max(0, (duration - currentTime) / fadeWindow);
        }

        video.style.opacity = nextOpacity.toString();
      }

      frameId = window.requestAnimationFrame(updateOpacity);
    };

    const startPlayback = async () => {
      try {
        await video.play();
      } catch {
        video.style.opacity = "1";
      }
    };

    const handleEnded = () => {
      video.style.opacity = "0";

      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
      }

      restartTimeoutRef.current = window.setTimeout(() => {
        video.currentTime = 0;
        void startPlayback();
      }, 100);
    };

    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    void startPlayback();

    frameId = window.requestAnimationFrame(updateOpacity);
    video.addEventListener("ended", handleEnded);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      video.removeEventListener("ended", handleEnded);

      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="social-proof-section" id="features">
      <video
        ref={videoRef}
        className="social-proof-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        style={{ opacity: 0 }}
      >
        <source src={videoSource} type="video/mp4" />
      </video>

      <div className="social-proof-overlay" aria-hidden="true" />

      <div className="social-proof-content">
        <div className="social-proof-spacer" aria-hidden="true" />

        <div className="social-proof-marquee" id="solutions">
          <p className="social-proof-label">
            Relied on by brands
            <br />
            across the globe
          </p>

          <div className="marquee-track-wrap">
            <div className="marquee-track">
              {[...brands, ...brands].map((brand, index) => (
                <div
                  key={`${brand}-${index}`}
                  className="marquee-item"
                  aria-hidden={index >= brands.length ? "true" : undefined}
                >
                  <span className="marquee-mark liquid-glass" aria-hidden="true">
                    {brand.charAt(0)}
                  </span>
                  <span>{brand}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="landing-meta-grid" id="plans">
          <article className="landing-meta-card liquid-glass">
            <span>Merchant flow</span>
            <strong>Create, share, settle.</strong>
          </article>
          <article className="landing-meta-card liquid-glass">
            <span>Stablecoin rails</span>
            <strong>USDm, USDC, and USDT on Celo.</strong>
          </article>
          <article className="landing-meta-card liquid-glass" id="learning">
            <span>Proof layer</span>
            <strong>Optional invoice publishing for auditability.</strong>
          </article>
        </div>
      </div>
    </section>
  );
}
