/**
 * ESLint rule: require cursor-pointer on interactive elements
 *
 * Ensures all <button> and <a> elements have the cursor-pointer class
 * in their className attribute to provide visual feedback to users.
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require cursor-pointer class on all buttons and links',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      missingCursorPointer:
        '{{ element }} should have "cursor-pointer" in its className for consistent UX feedback',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name;

        // Check if this is a button or anchor element
        if (elementName !== 'button' && elementName !== 'a') {
          return;
        }

        // Skip if it's a disabled button (users won't interact with it)
        if (elementName === 'button') {
          const disabledAttr = node.attributes.find(
            (attr) => attr.name && attr.name.name === 'disabled'
          );
          if (disabledAttr) {
            return;
          }
        }

        // Find className attribute
        const classNameAttr = node.attributes.find(
          (attr) => attr.name && attr.name.name === 'className'
        );

        if (!classNameAttr || classNameAttr.type !== 'JSXAttribute') {
          return;
        }

        const value = classNameAttr.value;

        // Handle string literals
        if (value && value.type === 'Literal' && typeof value.value === 'string') {
          if (!hasCursorPointer(value.value)) {
            context.report({
              node,
              messageId: 'missingCursorPointer',
              data: { element: `<${elementName}>` },
            });
          }
          return;
        }

        // Handle template literals
        if (value && value.type === 'JSXExpressionContainer') {
          const expr = value.expression;

          // Handle string literals in expressions
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            if (!hasCursorPointer(expr.value)) {
              context.report({
                node,
                messageId: 'missingCursorPointer',
                data: { element: `<${elementName}>` },
              });
            }
            return;
          }

          // Handle template literals
          if (expr.type === 'TemplateLiteral') {
            const allQuasiText = expr.quasis.map((q) => q.value.cooked).join('');
            if (!hasCursorPointer(allQuasiText)) {
              context.report({
                node,
                messageId: 'missingCursorPointer',
                data: { element: `<${elementName}>` },
              });
            }
            return;
          }

          // For complex expressions (variables, conditionals), skip the check
          // as we cannot statically determine if cursor-pointer will be present
          return;
        }
      },
    };
  },
};

function hasCursorPointer(classString) {
  // Match cursor-pointer as a complete class (not as part of another word)
  return /(?:^|\s)cursor-pointer(?:\s|$)/.test(classString);
}
