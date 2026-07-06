import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quản lý phòng - Tính lương nhân viên",
    short_name: "Rent Room",
    description: "Ứng dụng quản lý ca làm và tính lương nhân viên theo giờ",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#15181f",
    icons: [
      { src: "/file.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
