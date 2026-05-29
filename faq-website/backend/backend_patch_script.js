const fs = require('fs');
const path = require('path');

const controllers = ['faqController.js', 'authController.js', 'discussionController.js'];

controllers.forEach(file => {
  const filePath = path.join(__dirname, 'controllers', file);
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes("const asyncHandler")) return; // already applied
  
  content = `const asyncHandler = require('../utils/asyncHandler');\n` + content;
  content = content.replace(/exports\.(\w+)\s*=\s*async\s*\(([^)]+)\)\s*=>\s*\{/g, (match, p1, p2) => {
    return `exports.${p1} = asyncHandler(async (${p2}) => {`;
  });
  
  // Replace the closing `};` of each exports function with `});`
  // We can just rely on AST parsing. Actually, we can use Babel or just do it via string replacement.
});
