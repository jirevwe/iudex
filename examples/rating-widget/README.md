# Deep of Night - Rating Widget

A beautiful, animated rating widget for tracking depth progression in the Deep of Night game. This widget displays the current depth level, points, and progress towards the next depth tier.

## Features

- 5 depth levels with custom icons (1-5)
- Smooth progress bar animation
- Manual point controls (+100, +200, -100, -200, Set Points)
- Twitch chat integration
- localStorage persistence
- Hover-activated control panel

## Files

- `index.html` - The widget (standalone HTML file)
- `images/` - Depth level icons (depth-1.png through depth-5.png)
- `widget.spec.js` - Playwright UI tests

## Usage

### Open the Widget

Simply open `index.html` in a browser:

```bash
open examples/rating-widget/index.html
```

Or drag and drop the file into your browser.

### Controls

Hover over the widget to reveal the control panel:

- **Manual Controls**: Add or subtract points using the buttons
- **Set Points**: Enter a specific point value
- **Twitch Integration**: Connect to your Twitch channel to control via chat

### Depth Thresholds

| Depth | Point Range |
|-------|-------------|
| 1     | 0 - 1000    |
| 2     | 1000 - 2000 |
| 3     | 2000 - 4000 |
| 4     | 4000 - 6000 |
| 5     | 6000 - 10000|

## Testing

### Run Playwright Tests

The widget includes comprehensive Playwright tests that verify:
- Point addition and subtraction
- Depth level transitions
- Min/max point boundaries
- Progress bar updates
- localStorage persistence

To run the standalone Playwright tests:

```bash
npx playwright test examples/rating-widget/widget.spec.js
```

### Run via Iudex Framework

The widget tests are also integrated into the main test suite:

```bash
node cli/index.js run examples/httpbin.test.js --timeout 60000
```

The tests with prefix `widget.ui` will execute the Playwright tests.

## Test Coverage

- ✓ Display initial state (2500 points, Depth 3)
- ✓ Add 100 points
- ✓ Add 200 points
- ✓ Subtract 100 points
- ✓ Subtract 200 points
- ✓ Depth level changes when crossing thresholds
- ✓ Points cannot go below 0
- ✓ Points cannot exceed 10000
- ✓ Progress bar updates correctly
- ✓ Points persist in localStorage

## Development

To modify the widget:
1. Edit `index.html`
2. Run the tests to verify changes
3. Open in browser to preview

The widget is fully self-contained with inline CSS and JavaScript.
