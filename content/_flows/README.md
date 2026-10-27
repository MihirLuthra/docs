# Shared flows

UI tasks that several pages need, written once (decision D16). A page shows
one inline, so readers never leave the page for a step:

```mdx
import CreateGroup from '../../../_flows/armor/create-a-group.mdx';

<CreateGroup group="model-serving" />
```

Folders and files starting with `_` are not pages; this one isn't in the
sidebar or the search. Each flow says which props it takes at the top.
Screenshots live in `img/` (lossless WebP, captured at about 2x; marks in
percent of the image).
