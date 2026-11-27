extends VBoxContainer

const SCENE := preload("res://scripts/cave_scene.gd")
const NAV := preload("res://scripts/cave_navigation.gd")
const ICONS := preload("res://art/cave-interface.png")
const PAPER := Color("#fff2d7")
const INK := Color("#3b2b1f")
const GOLD := Color("#ffce58")
const GREEN := Color("#75dfc0")
const BLUE := Color("#86d9ec")
const RED := Color("#ff967c")
const MUTED := Color("#aea4c3")
const FRAME_NAMES := ["hud", "sheet", "card", "btnGold", "btnAlt", "btnSeal", "btnOff"]
const ICON_NAMES := ["stone", "pojing", "life", "mail"]

var data: Dictionary
var handlers: Dictionary
var main_view: Dictionary


func _init(state_view: Dictionary, callbacks: Dictionary, guide: Dictionary, problem: String) -> void:
	main_view = state_view
	data = state_view["homeHud"]
	handlers = callbacks
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_theme_constant_override("separation", 6)
	add_child(resource_strip())
	add_child(timeline_strip())
	if not problem.is_empty():
		var warning := caption(problem, 14, RED)
		warning.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		add_child(warning)
	add_child(scene_panel(guide))
	add_child(cultivation_strip())
	add_child(metric_strip())
	add_child(goal_strip())
	if not String(data["log"]).is_empty():
		var log_button := tap_button(data["log"], handlers["inbox"], "hud", 23, 13)
		log_button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		log_button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		add_child(log_button)
	if not main_view["ascended"]:
		add_child(season_strip(guide.get("target", "") == "season"))
	add_child(make_navigation(state_view, handlers, "", "exp" if guide.get("target", "") == "trip" else ""))


static func make_navigation(state_view: Dictionary, callbacks: Dictionary, active := "", highlight := "") -> HBoxContainer:
	var hud: Dictionary = state_view.get("homeHud", {})
	var locks := {
		"home": "历练后开" if hud.get("homeLocked", false) else "",
		"gear": "历练后开" if hud.get("gearLocked", false) else "",
		"world": "筑基开" if hud.get("worldLocked", false) else "",
	}
	if state_view.get("ascended", false):
		locks["exp"] = "已飞升"
	return NAV.new(callbacks, active, locks, highlight)


static func frame(name: String, margin_x := 8, margin_y := 4) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = ICONS
	style.region_rect = Rect2(FRAME_NAMES.find(name) * 20, 24, 20, 20)
	for side in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]:
		style.set_texture_margin(side, 6)
		style.set_content_margin(side, margin_x if side in [SIDE_LEFT, SIDE_RIGHT] else margin_y)
	return style


static func icon(which: String) -> Texture2D:
	var texture := AtlasTexture.new()
	texture.atlas = ICONS
	texture.region = Rect2(ICON_NAMES.find(which) * 24, 0, 24, 24)
	texture.filter_clip = true
	return texture


static func tap_button(text: String, callback: Callable, skin := "hud", height := 44, font_size := 16) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = height
	button.add_theme_font_size_override("font_size", font_size)
	button.add_theme_stylebox_override("normal", frame(skin))
	button.add_theme_stylebox_override("hover", frame(skin))
	button.add_theme_stylebox_override("pressed", frame("btnGold"))
	button.add_theme_stylebox_override("disabled", frame("btnOff"))
	var tint := INK if skin in ["btnGold", "btnAlt", "card", "sheet"] else PAPER
	for style in ["font_color", "font_hover_color", "font_focus_color"]:
		button.add_theme_color_override(style, tint)
	button.add_theme_color_override("font_pressed_color", INK)
	button.pressed.connect(callback)
	return button


static func caption(text: String, points: int, tint := PAPER) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", points)
	label.add_theme_color_override("font_color", tint)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label


static func framed_row(skin := "hud") -> PanelContainer:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", frame(skin))
	return card


func resource_strip() -> Control:
	var strip := framed_row()
	var line := HBoxContainer.new()
	line.add_theme_constant_override("separation", 8)
	strip.add_child(line)
	line.add_child(icon_label("stone", main_view["stones"], BLUE))
	if data["pills"] != null:
		line.add_child(icon_label("pojing", str(int(data["pills"])), Color("#ffb87a")))
	line.add_child(icon_label("life", data["life"], RED if data["lifeLow"] else PAPER))
	var gap := Control.new()
	gap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	line.add_child(gap)
	var letters := int(main_view.get("mail", 0))
	var mail_text := "纸鹤 %d" % letters if letters > 0 else "纸鹤"
	var mail := tap_button(mail_text, handlers["inbox"], "hud", 36, 14)
	mail.icon = icon("mail")
	mail.add_theme_constant_override("icon_max_width", 17)
	line.add_child(mail)
	return strip


func icon_label(which: String, text: String, tint: Color) -> HBoxContainer:
	var row := HBoxContainer.new()
	var sprite := TextureRect.new()
	sprite.texture = icon(which)
	sprite.custom_minimum_size = Vector2(18, 19)
	sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	row.add_child(sprite)
	row.add_child(caption(text, 16, tint))
	return row


func timeline_strip() -> Control:
	var time := tap_button("", handlers["timeline"], "hud", 46)
	var margin := MarginContainer.new()
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 8 if side in ["left", "right"] else 4)
	time.add_child(margin)
	var details := VBoxContainer.new()
	details.mouse_filter = Control.MOUSE_FILTER_IGNORE
	details.add_theme_constant_override("separation", 2)
	margin.add_child(details)
	var line := HBoxContainer.new()
	line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	details.add_child(line)
	var date := caption(main_view["date"], 15)
	date.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	line.add_child(date)
	line.add_child(caption(data["timeText"], 15, GOLD))
	var pips := HBoxContainer.new()
	pips.add_theme_constant_override("separation", 3)
	pips.mouse_filter = Control.MOUSE_FILTER_IGNORE
	details.add_child(pips)
	var slots: Array = data["timeSlots"]
	for i in slots.size():
		var pip := ColorRect.new()
		pip.mouse_filter = Control.MOUSE_FILTER_IGNORE
		pip.custom_minimum_size.y = 7
		pip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		pip.color = GOLD if i == int(data["timeIndex"]) else Color("#d84556") if slots[i] == "big" else Color("#76708c") if slots[i] == "past" else Color("#403758")
		pips.add_child(pip)
	return time


func scene_panel(guide: Dictionary) -> Control:
	var scene := SCENE.new()
	scene.data = data
	scene.custom_minimum_size.y = 210
	scene.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var badge := VBoxContainer.new()
	badge.position = Vector2(7, 7)
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene.add_child(badge)
	var title := "大道已成" if main_view["ascended"] else "打坐中   修为 +%s/月" % data["gain"]
	var scene_state := framed_row()
	scene_state.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene_state.add_child(caption(title, 14, GREEN))
	badge.add_child(scene_state)
	if not String(data["world"]).is_empty():
		badge.add_child(tap_button(data["world"], handlers["timeline"], "hud", 34, 13))
	if main_view.get("visitor") is Dictionary:
		badge.add_child(tap_button(main_view["visitor"]["title"], handlers["visitor"], "btnAlt", 38, 14))
	if guide.get("target", "") in ["trip", "season", "breakthrough"]:
		var speech := framed_row("sheet")
		speech.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
		speech.anchor_left = 0.06
		speech.anchor_right = 0.94
		speech.offset_left = 0
		speech.offset_right = 0
		speech.offset_top = 64
		speech.offset_bottom = 122
		speech.mouse_filter = Control.MOUSE_FILTER_IGNORE
		scene.add_child(speech)
		var line := HBoxContainer.new()
		line.mouse_filter = Control.MOUSE_FILTER_IGNORE
		speech.add_child(line)
		var portrait := TextureRect.new()
		portrait.texture = preload("res://scripts/story_stage.gd").portrait_texture(data["elderPortrait"])
		portrait.custom_minimum_size = Vector2(35, 44)
		portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
		line.add_child(portrait)
		var words := caption(guide["text"], 17, INK)
		words.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		words.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		words.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		line.add_child(words)
	var elder := tap_button("", handlers["advice"], "hud", 49)
	elder.custom_minimum_size.x = 46
	elder.accessibility_name = "老祖 · 变强建议"
	elder.icon = preload("res://scripts/story_stage.gd").portrait_texture("elder|n|")
	elder.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	elder.expand_icon = true
	elder.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	elder.offset_left = -55
	elder.offset_top = -58
	elder.offset_right = -6
	elder.offset_bottom = -6
	scene.add_child(elder)
	return scene


func cultivation_strip() -> Control:
	var ready: bool = main_view["canBreak"]
	var frame_name := "btnGold" if ready else "hud"
	var strip := tap_button("", handlers["breakthrough"] if ready else handlers["cultivation"], frame_name, 64)
	var margins := MarginContainer.new()
	margins.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margins.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margins.add_theme_constant_override("margin_" + side, 8 if side in ["left", "right"] else 4)
	strip.add_child(margins)
	var content := VBoxContainer.new()
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_theme_constant_override("separation", 1)
	margins.add_child(content)
	var top := HBoxContainer.new()
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(top)
	var realm := caption(main_view["realm"], 24, INK if ready else PAPER)
	realm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(realm)
	top.add_child(caption(data["cultivationHint"], 14, INK if ready else MUTED))
	var xp := "修为 %s / %s" % [main_view["xp"], main_view["xpNeed"]]
	content.add_child(meter(data["xpProgress"], GOLD if ready else GREEN, xp, 20))
	return strip


func metric_strip() -> Control:
	var strip := HBoxContainer.new()
	strip.add_theme_constant_override("separation", 6)
	for stat in [["战力", main_view["power"], RED, "power"], ["修炼/月", "+" + data["gain"], GREEN, "cultivation"], ["灵石/月", "+" + data["income"], BLUE, "income"]]:
		var cell := tap_button("", handlers[stat[3]], "hud", 50)
		cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		cell.accessibility_name = stat[0] + " " + stat[1]
		var words := VBoxContainer.new()
		words.mouse_filter = Control.MOUSE_FILTER_IGNORE
		words.add_theme_constant_override("separation", 0)
		words.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		words.offset_left = 8
		words.offset_top = 4
		words.add_child(caption(stat[0], 13, MUTED))
		words.add_child(caption(stat[1], 19, stat[2]))
		cell.add_child(words)
		strip.add_child(cell)
	return strip


func goal_strip() -> Control:
	var card := framed_row()
	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 7)
	card.add_child(columns)
	var details := VBoxContainer.new()
	details.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	details.add_theme_constant_override("separation", 1)
	columns.add_child(details)
	var title := tap_button(data["chapterName"] + " · " + main_view["goal"], handlers["advice"], "hud", 26, 14)
	title.alignment = HORIZONTAL_ALIGNMENT_LEFT
	title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	details.add_child(title)
	details.add_child(meter(data["goalProgress"], GOLD, main_view["progress"], 16))
	if not String(main_view["advice"]).is_empty() and not main_view["ascended"]:
		var advice := caption("下一步 · " + main_view["advice"], 14)
		advice.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		advice.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		details.add_child(advice)
		var cost := int(main_view.get("adviceAp", 0))
		var label := "去 ◆%d" % cost if cost > 0 else "去 ▸"
		var go := tap_button(label, handlers["goal"], "btnSeal", 45, 16)
		go.custom_minimum_size.x = 68
		go.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		go.disabled = cost > int(main_view["ap"])
		columns.add_child(go)
	return card


func season_strip(highlight: bool) -> Control:
	var card := framed_row()
	var contents := HBoxContainer.new()
	contents.add_theme_constant_override("separation", 4)
	card.add_child(contents)
	var ap := int(main_view["ap"])
	var total := int(main_view["apTotal"])
	var readout := caption("行动点 " + "◆".repeat(ap) + "◇".repeat(maxi(0, total - ap)), 16, GOLD)
	readout.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	contents.add_child(readout)
	var title := "下一季 ▸"
	if ap > 0:
		title += "\n剩 %d 点 → 打坐 +%s" % [ap, main_view["idleApXp"]]
	var next := tap_button(title, handlers["season"], "btnGold" if highlight or ap == 0 else "btnAlt", 46, 14)
	next.custom_minimum_size.x = 138
	contents.add_child(next)
	return card


static func meter(value: float, tint: Color, text: String, height: int) -> Control:
	var rail := ColorRect.new()
	rail.color = Color("#16111f")
	rail.custom_minimum_size.y = height
	rail.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fill := ColorRect.new()
	fill.color = tint.darkened(0.35)
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fill.anchor_right = clampf(value, 0.0, 1.0)
	fill.anchor_bottom = 1.0
	rail.add_child(fill)
	var label := caption(text, 13)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_outline_color", Color("#201828"))
	label.add_theme_constant_override("outline_size", 4)
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	rail.add_child(label)
	return rail
