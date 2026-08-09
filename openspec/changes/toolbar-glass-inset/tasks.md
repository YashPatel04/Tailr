## 1. FloatingToolbar — Layout Rewrite

- [x] 1.1 Change outer container from vertical `flex-col` to horizontal `flex-row`, remove fixed width `w-[44px]`, add `flex-wrap` and `gap-[2px]`
- [x] 1.2 Replace `rounded-xl` border/bg with glass inset classes: `backdrop-blur-xl`, semi-transparent bg, rounded-[10px], inset shadow
- [x] 1.3 Change button sizing from `w-9 h-9` to `w-8 h-8` (32px) for horizontal density
- [x] 1.4 Update separator dividers from vertical `w-5 h-px` to horizontal `w-px h-5`
- [x] 1.5 Move Insert dropdown from `right-full mr-2` (opens left) to `top-full mt-1` (opens downward)

## 2. DocumentCanvas — Remove Sidebar Slot

- [x] 2.1 Remove the `sticky top-20 self-start z-50 flex-shrink-0 pt-4` sidebar div that wraps FloatingToolbar
- [x] 2.2 Move `<FloatingToolbar />` rendering inside the paper container, before the resume content
- [x] 2.3 Adjust paper wrapper to use `overflow-hidden` for rounded corners on the toolbar

## 3. Verify

- [x] 3.1 Toolbar renders horizontally inside the paper at the top
- [x] 3.2 Glass blur effect visible in light and dark mode
- [x] 3.3 Insert dropdown opens downward
- [x] 3.4 Bold/Italic/Underline/Link/Undo/Redo all functional
- [x] 3.5 Toolbar scrolls with document content
