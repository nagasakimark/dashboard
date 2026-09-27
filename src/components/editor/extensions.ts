import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extensions'

/** Editor schema shared by the editor, the read-only view and printing. */
export const richTextExtensions = (placeholder = '') => [
  StarterKit.configure({ link: { openOnClick: false, autolink: true, defaultProtocol: 'https' } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Highlight,
  Placeholder.configure({ placeholder }),
]
