import { COLOR_ASSIST_MODES, COLOR_MATRICES, DICHROMACY_TYPES, blendMatrixValues } from '@/lib/filters';

// Two filters per dichromacy type: `<type>-simulate` shows what the person's cones drop,
// `<type>-correct` daltonizes the page so confusable hues separate. updateColorMatrices()
// rewrites both sets' `values` whenever the intensity changes.
export function FilterOverlay() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        {COLOR_ASSIST_MODES.map(assist =>
          DICHROMACY_TYPES.map(type => (
            <filter key={`${type}-${assist}`} id={`${type}-${assist}`} colorInterpolationFilters="linearRGB">
              <feColorMatrix
                id={`${type}-${assist}-matrix`}
                type="matrix"
                values={blendMatrixValues(COLOR_MATRICES[assist][type], 1)}
              />
            </filter>
          ))
        )}
      </defs>
    </svg>
  );
}
