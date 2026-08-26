/**
 * ESLint rule: detect repeated className patterns across files
 *
 * Warns when the SAME exact Tailwind className appears in 3+ different files.
 * This indicates a strong consolidation candidate — the pattern is duplicated
 * across the codebase and could become a shared constant or component.
 *
 * Deliberately ignores:
 * - Patterns repeated only within the same file (local issue, not consolidation)
 * - Similar patterns (only exact matches count as true duplication)
 *
 * Reports as 'warn' not 'error' because it's a quality suggestion,
 * not a correctness issue. The dev should evaluate if consolidation
 * is actually worth it (sometimes duplication is intentional).
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn about repeated className patterns that might benefit from consolidation',
      recommended: false,
    },
    messages: {
      repeatedExact:
        'className appears {{ count }} times — consider extracting to a constant or component',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    // Map of exact className string -> { files (Set), locations (array of {file, node}) }
    const classNameMap = new Map();

    return {
      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'className') {
          return;
        }

        const value = node.value;
        if (!value) return;

        let classNameString = null;

        // Handle string literals
        if (value.type === 'Literal' && typeof value.value === 'string') {
          classNameString = value.value;
        }
        // Handle JSX expressions
        else if (value.type === 'JSXExpressionContainer') {
          const expr = value.expression;
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            classNameString = expr.value;
          }
          // For template literals and complex expressions, skip
          if (!classNameString) return;
        }

        if (!classNameString || classNameString.length < 15) {
          return; // Ignore very short classNames, too generic
        }

        // Use exact string, no normalization (order matters for intentional differences)
        const key = classNameString;
        const filePath = sourceCode.filename || 'unknown';

        if (!classNameMap.has(key)) {
          classNameMap.set(key, {
            files: new Set([filePath]),
            locations: [{ file: filePath, node }],
          });
        } else {
          const entry = classNameMap.get(key);
          entry.files.add(filePath);
          entry.locations.push({ file: filePath, node });
        }
      },

      'Program:exit'() {
        // Report only patterns that appear in 3+ different files
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        classNameMap.forEach((entry, _className) => {
          if (entry.files.size >= 3) {
            // Only report locations from 2nd+ file (1st location is the definition)
            entry.locations.forEach(({ node, file }, idx) => {
              if (idx > 0 || file !== [...entry.files][0]) {
                context.report({
                  node,
                  messageId: 'repeatedExact',
                  data: { count: entry.files.size },
                });
              }
            });
          }
        });
      },
    };
  },
};
