import { createElement, useEffect } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { richTextExtensions } from './extensions'
import { normalizeLegacyHtml } from './richText'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  label?: string
}

export function RichTextEditor({ value, onChange, placeholder = 'Write your lesson plan…', className, label = 'Lesson content' }: Props) {
  const editor = useEditor({
    extensions: richTextExtensions(placeholder),
    content: normalizeLegacyHtml(value),
    editorProps: {
      attributes: {
        class: 'prose-lesson min-h-72 px-4 py-3 focus:outline-none',
        'aria-label': label,
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  })

  // Accept external replacements (e.g. switching documents) without
  // clobbering the cursor while the user types.
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML())
      editor.commands.setContent(normalizeLegacyHtml(value), { emitUpdate: false })
  }, [editor, value])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-line bg-surface focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15',
        className,
      )}
    >
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive('heading', { level: 1 })
        ? 'h1'
        : e.isActive('heading', { level: 2 })
          ? 'h2'
          : e.isActive('heading', { level: 3 })
            ? 'h3'
            : 'p',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
  const chain = () => editor.chain().focus()

  const btn = (icon: LucideIcon, label: string, active: boolean, run: () => void, disabled = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={cn(
        'grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-35',
        active ? 'bg-accent-soft text-accent-strong' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
      )}
    >
      {createElement(icon, { size: 16, 'aria-hidden': true })}
    </button>
  )
  const sep = <span className="mx-1 h-5 w-px bg-line" aria-hidden />

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link address', prev ?? 'https://')
    if (url === null) return
    if (url.trim() === '' || url === 'https://') chain().extendMarkRange('link').unsetLink().run()
    else chain().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-line bg-canvas/60 px-2 py-1.5"
    >
      <select
        aria-label="Text style"
        value={s.block}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'p') chain().setParagraph().run()
          else
            chain()
              .toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 })
              .run()
        }}
        className="h-8 rounded-lg bg-transparent px-2 text-sm font-medium text-ink-soft hover:bg-ink/5"
      >
        <option value="p">Text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      {sep}
      {btn(Bold, 'Bold (Ctrl+B)', s.bold, () => chain().toggleBold().run())}
      {btn(Italic, 'Italic (Ctrl+I)', s.italic, () => chain().toggleItalic().run())}
      {btn(Underline, 'Underline (Ctrl+U)', s.underline, () => chain().toggleUnderline().run())}
      {btn(Strikethrough, 'Strikethrough', s.strike, () => chain().toggleStrike().run())}
      {btn(Highlighter, 'Highlight', s.highlight, () => chain().toggleHighlight().run())}
      {sep}
      {btn(List, 'Bullet list', s.bullet, () => chain().toggleBulletList().run())}
      {btn(ListOrdered, 'Numbered list', s.ordered, () => chain().toggleOrderedList().run())}
      {btn(Quote, 'Quote', s.quote, () => chain().toggleBlockquote().run())}
      {sep}
      {btn(AlignLeft, 'Align left', s.left, () => chain().setTextAlign('left').run())}
      {btn(AlignCenter, 'Align centre', s.center, () => chain().setTextAlign('center').run())}
      {btn(AlignRight, 'Align right', s.right, () => chain().setTextAlign('right').run())}
      {sep}
      {btn(Link2, 'Link', s.link, setLink)}
      {btn(RemoveFormatting, 'Clear formatting', false, () => chain().unsetAllMarks().clearNodes().run())}
      <span className="ml-auto flex">
        {btn(Undo2, 'Undo (Ctrl+Z)', false, () => chain().undo().run(), !s.canUndo)}
        {btn(Redo2, 'Redo (Ctrl+Shift+Z)', false, () => chain().redo().run(), !s.canRedo)}
      </span>
    </div>
  )
}
