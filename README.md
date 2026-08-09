# ProChess

A polished browser chess game with:
- Bot vs User and User vs User
- Beginner, Easy, Medium, Hard, More Hard, Next Level Hard
- Puzzle mode
- Sound on/off
- Classic, Midnight, Forest and Rose themes
- Horizontal/Vertical layout
- White, Black or Alternative player colour
- Undo, hint, flip board, resign
- Local settings saved in the browser
- Responsive desktop/mobile layout

## Run
You can now double-click `index.html` and open it directly from Windows File Explorer.

The game loads a browser build of `chess.js` from a CDN, so an internet connection is needed when the page loads. For development, VS Code Live Server is also recommended.

The bot is a local minimax/alpha-beta bot with adjustable search depth. It is designed to be lightweight and educational rather than a replacement for a full Stockfish-strength engine.

## Files
- index.html — interface
- style.css — professional responsive styling
- app.js — chess logic, bot, puzzles and settings
