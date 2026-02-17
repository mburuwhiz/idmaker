import { mmToPx, pxToMm, CR80_WIDTH_MM, CR80_WIDTH_PX } from './src/utils/units'

function test() {
  console.log('Testing Units Utility...')

  // 300 DPI: 1 inch = 25.4mm = 300px
  // 1mm = 300/25.4 = 11.811 px

  const widthPx = mmToPx(CR80_WIDTH_MM)
  console.log(`CR80 Width (86mm) in Px: ${widthPx} (Expected: ~1015.75)`)

  if (Math.abs(widthPx - 1015.748) < 0.001) {
    console.log('mmToPx Test Passed!')
  } else {
    console.error('mmToPx Test Failed!')
    process.exit(1)
  }

  const roundedWidth = Math.round(widthPx)
  if (roundedWidth === 1016) {
    console.log('CR80 Rounding Test Passed! (1016px)')
  } else {
    console.error('CR80 Rounding Test Failed!')
    process.exit(1)
  }
}

test()
