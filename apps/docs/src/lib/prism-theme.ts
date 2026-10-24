import type {PrismTheme} from 'prism-react-renderer';

/**
 * Code highlighting, light and dark alike: every colour is a token from
 * custom.css (--fx-code-*), so the theme switches with the site and each
 * token keeps a contrast of at least 4.5:1 on the code background.
 */
const prismTheme: PrismTheme = {
  plain: {color: 'var(--fx-code-text)', backgroundColor: 'var(--fx-code-bg)'},
  styles: [
    {types: ['comment', 'prolog', 'doctype', 'cdata'], style: {color: 'var(--fx-code-comment)', fontStyle: 'italic'}},
    {types: ['punctuation', 'operator'], style: {color: 'var(--fx-code-text)'}},
    {types: ['string', 'char', 'attr-value', 'regex', 'inserted'], style: {color: 'var(--fx-code-string)'}},
    {types: ['keyword', 'selector', 'important', 'atrule', 'deleted'], style: {color: 'var(--fx-code-keyword)'}},
    {types: ['function', 'class-name', 'builtin'], style: {color: 'var(--fx-code-function)'}},
    {types: ['property', 'attr-name', 'number', 'boolean', 'constant', 'symbol'], style: {color: 'var(--fx-code-property)'}},
    {types: ['tag', 'namespace'], style: {color: 'var(--fx-code-tag)'}},
    {types: ['variable', 'parameter'], style: {color: 'var(--fx-code-variable)'}},
  ],
};

export default prismTheme;
