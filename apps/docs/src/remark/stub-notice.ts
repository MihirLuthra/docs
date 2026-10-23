// Adds a "Stub" note to the top of pages with `status: stub` in front matter,
// so stubs don't each repeat it in their body. Runs before Docusaurus turns
// `:::note` directives into admonitions, and ships no client JS.
type Node = {type: string; [key: string]: unknown};
type Root = {children: Node[]};
type VFile = {data: {frontMatter?: {status?: unknown}}};

export default function stubNotice() {
  return (tree: Root, file: VFile) => {
    if (file.data.frontMatter?.status !== 'stub') return;
    tree.children.unshift({
      type: 'containerDirective',
      name: 'note',
      attributes: {title: 'Stub'},
      children: [
        {
          type: 'paragraph',
          children: [{type: 'text', value: "This page hasn't been written yet."}],
        },
      ],
    });
  };
}
