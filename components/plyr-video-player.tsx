"use client";

import { useEffect, useRef, useCallback, useLayoutEffect } from "react";
import "plyr/dist/plyr.css";

interface PlyrVideoPlayerProps {
  videoUrl?: string;
  youtubeVideoId?: string;
  videoType?: "UPLOAD" | "YOUTUBE";
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export const PlyrVideoPlayer = ({
  videoUrl,
  youtubeVideoId,
  videoType = "UPLOAD",
  className,
  onEnded,
  onTimeUpdate
}: PlyrVideoPlayerProps) => {
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const youtubeEmbedRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const callbacksRef = useRef({ onEnded, onTimeUpdate });
  const isDestroyingRef = useRef(false);
  const isInitializingRef = useRef(false);

  // Keep callbacks ref updated without causing re-renders
  useEffect(() => {
    callbacksRef.current = { onEnded, onTimeUpdate };
  }, [onEnded, onTimeUpdate]);

  const disableYoutubeOverlay = useCallback(() => {
    if (videoType !== "YOUTUBE") return;
    const iframe = playerRef.current?.elements?.container?.querySelector?.(
      "iframe"
    ) as HTMLIFrameElement | null;
    if (iframe) {
      iframe.style.pointerEvents = "none";
      iframe.setAttribute("tabindex", "-1");
    }
  }, [videoType]);

  // Cleanup function that properly destroys Plyr
  const destroyPlayer = useCallback(() => {
    if (isDestroyingRef.current) return;
    
    if (playerRef.current) {
      try {
        isDestroyingRef.current = true;
        
        // Destroy Plyr instance
        if (typeof playerRef.current.destroy === "function") {
          playerRef.current.destroy();
        }
        
        // Aggressively clean up ALL Plyr elements and wrappers
        if (containerRef.current) {
          // Remove all Plyr wrapper divs except the original media element
          const allPlyrElements = containerRef.current.querySelectorAll('.plyr');
          const originalMedia = videoType === "YOUTUBE" 
            ? youtubeEmbedRef.current 
            : html5VideoRef.current;
          
          allPlyrElements.forEach((el) => {
            // Remove if it's not the original element and doesn't contain it
            if (el !== originalMedia && !el.contains(originalMedia)) {
              el.remove();
            }
          });

          // Remove any Plyr post elements
          const plyrPosts = containerRef.current.querySelectorAll('.plyr__poster');
          plyrPosts.forEach((el) => el.remove());
        }
      } catch (error) {
        console.warn("Error destroying player:", error);
      } finally {
        playerRef.current = null;
        isDestroyingRef.current = false;
      }
    }
  }, []);

  // Use useLayoutEffect for cleanup to ensure it happens before React's DOM updates
  // Inline cleanup logic to avoid dependency array issues
  useLayoutEffect(() => {
    return () => {
      if (isDestroyingRef.current) return;
      
      if (playerRef.current) {
        try {
          isDestroyingRef.current = true;
          // Get the original element before destroy
          const media = playerRef.current.media;
          
          if (typeof playerRef.current.destroy === "function") {
            playerRef.current.destroy();
          }
          
          // Restore original element if Plyr modified it
          if (media && containerRef.current && !containerRef.current.contains(media)) {
            try {
              containerRef.current.appendChild(media);
            } catch (e) {
              // Element might already be in the right place or removed
            }
          }
        } catch (error) {
          console.warn("Error destroying player:", error);
        } finally {
          playerRef.current = null;
          isDestroyingRef.current = false;
        }
      }
    };
  }, []);

  // Initialize Plyr on mount/update
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function setupPlayer() {
      // Prevent multiple simultaneous initializations
      if (isInitializingRef.current) {
        return;
      }

      const targetEl =
        videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
      
      // Ensure we have a valid video source before initializing
      const hasValidSource = videoType === "YOUTUBE" 
        ? !!youtubeVideoId 
        : !!videoUrl;
      
      if (!targetEl || !hasValidSource) {
        return;
      }

      isInitializingRef.current = true;

      // Small delay to ensure DOM is ready, especially for YouTube embeds
      await new Promise(resolve => {
        timeoutId = setTimeout(resolve, 100);
      });

      if (isCancelled) {
        isInitializingRef.current = false;
        return;
      }

      // Destroy any previous instance first
      destroyPlayer();

      if (isCancelled) return;

      // Double-check element still exists
      const currentTargetEl = videoType === "YOUTUBE" 
        ? youtubeEmbedRef.current 
        : html5VideoRef.current;
      
      if (!currentTargetEl || isCancelled) return;

      // Aggressively clean up ALL Plyr elements and wrappers
      if (containerRef.current) {
        // Remove all Plyr wrapper divs
        const allPlyrElements = containerRef.current.querySelectorAll('.plyr');
        allPlyrElements.forEach((el) => {
          // If it's not the original video/div element, remove it
          if (el !== currentTargetEl && !el.contains(currentTargetEl)) {
            el.remove();
          }
        });

        // Remove any Plyr post elements (Plyr sometimes adds these)
        const plyrPosts = containerRef.current.querySelectorAll('.plyr__poster');
        plyrPosts.forEach((el) => el.remove());

        // Find and restore the original video element if it was wrapped
        if (videoType !== "YOUTUBE" && html5VideoRef.current) {
          const originalVideo = html5VideoRef.current;
          // If video is inside a Plyr wrapper, unwrap it
          const plyrWrapper = originalVideo.closest('.plyr');
          if (plyrWrapper && plyrWrapper !== containerRef.current) {
            // Move video back to container
            containerRef.current.appendChild(originalVideo);
            plyrWrapper.remove();
          }
        }
      }

      // Check if Plyr is already initialized on this element
      if ((currentTargetEl as any).plyr) {
        try {
          (currentTargetEl as any).plyr.destroy();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }

      // Dynamically import Plyr to be SSR-safe
      const plyrModule: any = await import("plyr");
      const Plyr: any = plyrModule.default ?? plyrModule;

      if (isCancelled) return;

      try {
        const player = new Plyr(currentTargetEl, {
          controls: [
            "play-large",
            "play",
            "progress",
            "current-time",
            "duration",
            "mute",
            "volume",
            "captions",
            "settings",
            "pip",
            "airplay",
            "fullscreen"
          ],
          settings: ["speed", "quality", "loop"],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          youtube: { rel: 0, modestbranding: 1 },
          ratio: "16:9"
        });

        playerRef.current = player;

        // Use ref callbacks to avoid dependency issues
        player.on("ended", () => {
          if (callbacksRef.current.onEnded) {
            callbacksRef.current.onEnded();
          }
        });
        
        player.on("timeupdate", () => {
          if (callbacksRef.current.onTimeUpdate) {
            callbacksRef.current.onTimeUpdate(player.currentTime || 0);
          }
        });
        
        player.on("ready", () => {
          disableYoutubeOverlay();
        });
        
        // Also call immediately in case ready already fired
        disableYoutubeOverlay();
      } catch (error) {
        console.error("Error initializing Plyr:", error);
      } finally {
        isInitializingRef.current = false;
      }
    }

    setupPlayer();

    return () => {
      isCancelled = true;
      isInitializingRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      destroyPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, youtubeVideoId, videoType, disableYoutubeOverlay]);

  const hasVideo = (videoType === "YOUTUBE" && !!youtubeVideoId) || !!videoUrl;

  if (!hasVideo) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">لا يوجد فيديو</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`aspect-video ${className || ""}`}
      key={`container-${videoType}-${videoUrl || youtubeVideoId || 'none'}`}
    >
      {videoType === "YOUTUBE" && youtubeVideoId ? (
        <div
          ref={youtubeEmbedRef}
          data-plyr-provider="youtube"
          data-plyr-embed-id={youtubeVideoId}
          className="w-full h-full"
        />
      ) : (
        <video 
          ref={html5VideoRef} 
          className="w-full h-full" 
          playsInline 
          crossOrigin="anonymous"
        >
          {videoUrl ? (
            <>
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
              <source src={videoUrl} type="video/ogg" />
              Your browser does not support the video tag.
            </>
          ) : null}
        </video>
      )}
    </div>
  );
};