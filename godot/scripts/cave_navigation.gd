extends HBoxContainer

const ART := preload("res://art/cave-nav-icons.png")
const DESTINATIONS := {
	"exp": "历练",
	"home": "洞府",
	"gear": "装备",
	"world": "江湖",
	"path": "仙途",
}
const ICON_SIZE := 24
const FRAME_SIZE := 20
const GOLD := Color("#f4c542")


func _init(callbacks: Dictionary, active := "", lock_reasons := {}, highlighted := "") -> void:
	add_theme_constant_override("separation", 5)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var normal := frame(0)
	var gold := frame(1)
	for id in DESTINATIONS:
		var tile := Button.new()
		var title: String = DESTINATIONS[id]
		var reason := String(lock_reasons.get(id, ""))
		var locked := not reason.is_empty()
		var callback: Callable = callbacks.get(id, Callable())
		var selected: bool = id == active
		tile.custom_minimum_size = Vector2(46, 58)
		tile.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tile.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		tile.disabled = locked or not callback.is_valid()
		tile.accessibility_name = title
		tile.accessibility_description = reason
		tile.tooltip_text = reason
		tile.add_theme_stylebox_override("normal", gold if selected else normal)
		tile.add_theme_stylebox_override("hover", gold if selected else normal)
		tile.add_theme_stylebox_override("pressed", gold)
		tile.add_theme_stylebox_override("disabled", normal)
		if callback.is_valid():
			tile.pressed.connect(callback)
		add_child(tile)
		add_tile_contents(tile, title, reason, get_child_count() - 1, selected)
		if id == highlighted and not tile.disabled and not selected:
			add_highlight(tile)


func add_tile_contents(tile: Button, title: String, reason: String, icon_index: int, selected: bool) -> void:
	var locked := not reason.is_empty()
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tile.add_child(center)

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 2)
	stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(stack)

	var icon := TextureRect.new()
	var texture := AtlasTexture.new()
	texture.atlas = ART
	texture.region = Rect2(icon_index * ICON_SIZE, ICON_SIZE if locked else 0, ICON_SIZE, ICON_SIZE)
	texture.filter_clip = true
	icon.texture = texture
	icon.custom_minimum_size = Vector2(28, 28)
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.add_child(icon)

	var label := Label.new()
	label.text = reason if locked else title
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 12 if locked else 15)
	var tint := Color("#9d93b8") if locked else Color("#3b2b1f") if selected else Color("#f3ecdc")
	label.add_theme_color_override("font_color", tint)
	stack.add_child(label)


func add_highlight(tile: Button) -> void:
	var border := Panel.new()
	border.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	border.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var outline := StyleBoxFlat.new()
	outline.draw_center = false
	outline.border_color = GOLD
	outline.set_border_width_all(2)
	border.add_theme_stylebox_override("panel", outline)
	tile.add_child(border)

	var badge := Label.new()
	badge.text = "去"
	badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	badge.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	badge.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	badge.offset_left = -21
	badge.offset_top = -2
	badge.offset_right = -2
	badge.offset_bottom = 17
	badge.add_theme_font_size_override("font_size", 12)
	badge.add_theme_color_override("font_color", Color("#fff6e0"))
	var seal := StyleBoxFlat.new()
	seal.bg_color = Color("#c8323c")
	badge.add_theme_stylebox_override("normal", seal)
	tile.add_child(badge)


func frame(index: int) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = ART
	style.region_rect = Rect2(index * FRAME_SIZE, ICON_SIZE * 2, FRAME_SIZE, FRAME_SIZE)
	for side in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]:
		style.set_texture_margin(side, 6)
	return style
