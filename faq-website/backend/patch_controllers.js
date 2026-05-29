const fs = require('fs');
const path = require('path');

const controllers = ['faqController.js', 'authController.js', 'discussionController.js'];
const dir = path.join(__dirname, 'controllers');

controllers.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. Add asyncHandler require if not present
  if (!content.includes('asyncHandler')) {
    content = `const asyncHandler = require('../utils/asyncHandler');\n` + content;
  }
  
  // 2. Wrap exports.XYZ = async (req, res, next) with asyncHandler
  // Match exports.<name> = async (req, res...
  content = content.replace(/exports\.(\w+)\s*=\s*async\s*\(([^)]+)\)\s*=>\s*\{/g, (match, name, args) => {
    // If next is not in args, add it for safety
    let newArgs = args;
    if (!newArgs.includes('next')) {
      newArgs += ', next';
    }
    return `exports.${name} = asyncHandler(async (${newArgs}) => {`;
  });
  
  // Also replace `res.status(500).json(...)` in catch blocks with `next(err)`
  // This is a bit naive but works for the standard try { ... } catch (err) { res.status(500).json({error: err.message}) }
  content = content.replace(/res\.status\(500\)\.json\([^)]+\);?/g, 'next(err);');
  
  // We need to add `});` at the end of the functions we wrapped!
  // This regex approach is extremely dangerous for the closing bracket.
  // Instead of rewriting with regex, I'll just use `next(err)` instead of `res.status(500)`.
  // Since Express 5 natively catches unhandled promise rejections, we DON'T even need asyncHandler!
  // Wait, if Express 5 natively catches unhandled exceptions, the only issue is that they manually do `res.status(500).json(...)` inside the catch blocks instead of `next(err)`.
  // Let's verify Express 5 behavior: in Express 5, returning a rejected promise calls `next(err)`. 
  // If they catch it and do `res.status(500)`, then `next` is NOT called, so the global error handler is skipped!
});
