// gosh.js
//
// Functional. Genuinely, completely functional, for the eleven minutes it
// was tested, entirely on one browser, by one person, at an hour that
// suggested the idea arrived less as inspiration and more as a coping
// mechanism for a very long day of actual work.
//
// To load it (why would you): chrome://extensions > Developer mode >
// Load unpacked > pick this folder.

const WORDS = ['damn', 'dammit', 'hell', 'crap', 'bloody', 'bollocks', 'shoot'];
// (the real list was longer. this is a family repository.)

const pattern = new RegExp(`\\b(${WORDS.join('|')})\\b`, 'gi');

function gosh(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    node.textContent = node.textContent.replace(pattern, 'gosh');
    return;
  }
  for (const child of node.childNodes) gosh(child);
}

gosh(document.body);

new MutationObserver((changes) => {
  for (const c of changes) c.addedNodes.forEach(gosh);
}).observe(document.body, { childList: true, subtree: true });

// it's 3am. why did I make this.
