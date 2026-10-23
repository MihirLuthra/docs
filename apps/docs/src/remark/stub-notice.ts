// Adds a small "Stub" note to the top of pages with `status: stub` in front
// matter, so stubs don't each repeat it in their body. Rendered as a plain
// paragraph with a class (styled in custom.css); ships no client JS.
type Node = {type: string; [key: string]: unknown};
type Root = {children: Node[]};
type VFile = {data: {frontMatter?: {status?: unknown}}};

export default function stubNotice() {
  return (tree: Root, file: VFile) => {
    if (file.data.frontMatter?.status !== 'stub') return;
    tree.children.unshift({
      type: 'paragraph',
      data: {hProperties: {className: ['stub-note']}},
      children: [
        {type: 'strong', children: [{type: 'text', value: 'Stub'}]},
        {type: 'text', value: " This page hasn't been written yet."},
      ],
    });
  };
}
