-- Personalización segura de etiquetas por grupo.
alter table public.member_chat_group_labels
 add column if not exists color text not null default 'purple',
 add column if not exists emoji text not null default '',
 add column if not exists style text not null default 'filled';
alter table public.member_chat_group_labels
 add constraint member_chat_group_labels_color_check
   check (color in ('purple','blue','pink','green','orange','gold','slate')),
 add constraint member_chat_group_labels_emoji_check
   check (emoji in ('','🌸','🎮','🎧','🔥','⭐','💜','🐉','🌙','✨','⚡','🎨','🕹️','📚')),
 add constraint member_chat_group_labels_style_check
   check (style in ('filled','outline','gradient','glow'));