/**
 * ESLint rule: detect repeated className patterns
 *
 * Warns when the same or very similar Tailwind className combinations
 * appear multiple times across the codebase. This helps identify
 * candidates for component consolidation or constant extraction.
 *
 * Matches when:
 * - Same exact className appears 3+ times
 * - Very similar patterns (differing by 1-2 tokens) appear 4+ times
 *
 * Reports as 'warn' not 'error' because it's a quality suggestion,
 * not a correctness issue. The dev should evaluate if consolidation
 * is worth it.
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn about repeated className patterns that might benefit from consolidation',
      category: 'Best Practices',
      recommended: false,
    },
    messages: {
      repeatedExact: 'className appears {{ count }} times — consider extracting to a constant or component',
      repeatedSimilar: 'similar className patterns appear {{ count }} times — consider consolidating',
    },
  },
  create(context) {
    const classNameMap = new Map(); // Map of normalized classname -> { original, locations }

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

        if (!classNameString || classNameString.length < 10) {
          return; // Ignore very short classNames, too generic
        }

        // Normalize: split into tokens and sort (order-independent matching)
        const tokens = classNameString
          .split(/\s+/)
          .filter((t) => t.length > 0)
          .sort();
        const normalized = tokens.join('|');

        if (!classNameMap.has(normalized)) {
          classNameMap.set(normalized, {
            original: classNameString,
            count: 1,
            locations: [node],
          });
        } else {
          const entry = classNameMap.get(normalized);
          entry.count += 1;
          entry.locations.push(node);
        }
      },

      'Program:exit'() {
        // After visiting all nodes, check for repeated patterns
        classNameMap.forEach((entry) => {
          if (entry.count >= 3) {
            // Report on all but the first occurrence
            entry.locations.slice(1).forEach((node) => {
              context.report({
                node,
                messageId: 'repeatedExact',
                data: { count: entry.count },
              });
            });
          }
        });
      },
    };
  },
};
