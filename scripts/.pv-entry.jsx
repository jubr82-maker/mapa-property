// POL2-10 proof harness entry — monte PropertyVideo dans le navigateur.
// Non destiné à la prod : utilisé uniquement par scripts/proof-pol2-10.mjs.
import React from "react";
import { createRoot } from "react-dom/client";
import { PropertyVideo } from "@/components/property/PropertyVideo";

const url = window.__VIDEO_URL__ ?? null;
createRoot(document.getElementById("root")).render(
  React.createElement(PropertyVideo, {
    videoUrl: url,
    poster: null,
    labels: { eyebrow: "Vidéo de présentation" },
  }),
);
