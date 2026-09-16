import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Expenses Tracker",
    short_name: "Expenses",
    description: "Personal income, expense and savings tracker in Indian Rupees.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#141416",
    lang: "en-IN",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
