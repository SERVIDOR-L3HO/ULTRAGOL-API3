{pkgs}: {
  deps = [
    pkgs.gtk3
    pkgs.nspr
    pkgs.glib
    pkgs.freetype
    pkgs.fontconfig
    pkgs.expat
    pkgs.dbus
    pkgs.cups
    pkgs.cairo
    pkgs.pango
    pkgs.libxkbcommon
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libxcb
    pkgs.xorg.libX11
    pkgs.at-spi2-atk
    pkgs.atk
    pkgs.alsa-lib
    pkgs.nss
    pkgs.chromium
  ];
}
