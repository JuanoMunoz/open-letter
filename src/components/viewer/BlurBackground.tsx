"use client";

import { motion } from "motion/react";

/** Fondo: primera foto (o la activa) difuminada + capa blanca; Ken Burns lento. */
export function BlurBackground({ photoUrl, clear }: { photoUrl?: string; clear: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {photoUrl ? (
        <>
          <motion.div
            className="absolute inset-0"
            animate={{ scale: [1.05, 1.15, 1.05] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt=""
              className="h-full w-full object-cover transition-all duration-700"
              style={{
                filter: clear ? "blur(0px) saturate(1.05)" : "blur(14px) saturate(1.05)",
              }}
            />
          </motion.div>
          <div
            data-bg-overlay
            className="absolute inset-0 bg-white transition-opacity duration-700"
            style={{ opacity: clear ? 0.15 : 0.78 }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #FFF5F8 0%, #FBE4EC 100%)" }}
        />
      )}
    </div>
  );
}
