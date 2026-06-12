export function FilterOverlay() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="deuteranopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix id="deuteranopia-matrix" type="matrix" values="
            0.367  0.861 -0.228  0  0
            0.280  0.673  0.047  0  0
           -0.012  0.043  0.969  0  0
            0      0      0      1  0"/>
        </filter>
        <filter id="protanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix id="protanopia-matrix" type="matrix" values="
            0.152  0.848  0      0  0
            0.114  0.886  0      0  0
            0      0.094  0.906  0  0
            0      0      0      1  0"/>
        </filter>
        <filter id="tritanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix id="tritanopia-matrix" type="matrix" values="
            1      0.168 -0.168  0  0
            0      0.920  0.080  0  0
            0      0.923  0.077  0  0
            0      0      0      1  0"/>
        </filter>
      </defs>
    </svg>
  );
}
