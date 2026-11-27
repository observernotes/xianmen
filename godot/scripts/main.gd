extends Control

const SAVE_PATH := "user://xiantu.json"
const RULES_PATH := "res://data/rules.js"
const FONT := preload("res://art/fusion-pixel.ttf")
const COLORS := {
	"gold": Color("#ffd990"),
	"text": Color("#efe4cf"),
	"muted": Color("#b4acbc"),
	"jade": Color("#a3e7c7"),
	"red": Color("#ff9c91"),
}
const HOME_ART := [
	preload("res://art/home-0.png"),
	preload("res://art/home-1.png"),
	preload("res://art/home-2.png"),
	preload("res://art/home-3.png"),
]
const PANELS := {"equipment": "法宝", "arts": "功法", "market": "坊市", "sect": "宗门"}

var runtime: Object
var view: Dictionary = {}
var page: VBoxContainer
var error_text := ""
var show_maps := false
var selected_map := -1
var show_journey := false
var show_saves := false
var share_code := ""
var redraw_queued := false
var dialogue_key := ""
var dialogue_index := 0


func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	theme = Theme.new()
	theme.default_font = FONT
	theme.default_font_size = 16
	if ClassDB.class_exists("XianmenRuntime"):
		runtime = ClassDB.instantiate("XianmenRuntime")
	if runtime == null or not FileAccess.file_exists(RULES_PATH):
		error_text = "缺少规则运行库或游戏数据。"
	elif not runtime.load_program(FileAccess.get_file_as_string(RULES_PATH)):
		error_text = runtime.get_last_error()
	elif FileAccess.file_exists(SAVE_PATH):
		request({"op": "load", "save": FileAccess.get_file_as_string(SAVE_PATH)})
	schedule_draw()


func request(message: Dictionary) -> void:
	if runtime == null:
		return
	var result = JSON.parse_string(runtime.request(JSON.stringify(message)))
	if not result is Dictionary:
		error_text = runtime.get_last_error()
	elif not result.get("ok", false):
		error_text = result.get("error", "无法完成操作")
	else:
		error_text = ""
		view = result.get("view", {})
		if result.get("save") != null and message["op"] != "export":
			store_save(result["save"])
		if message["op"] == "export":
			share_code = result.get("result", "")
	schedule_draw()


func store_save(save: Dictionary) -> void:
	var temporary := SAVE_PATH + ".tmp"
	var out := FileAccess.open(temporary, FileAccess.WRITE)
	if out == null:
		error_text = "本地存档写入失败。"
		return
	out.store_string(JSON.stringify(save))
	out.flush()
	out.close()
	var absolute_source := ProjectSettings.globalize_path(temporary)
	var absolute_target := ProjectSettings.globalize_path(SAVE_PATH)
	if DirAccess.rename_absolute(absolute_source, absolute_target) != OK:
		error_text = "本地存档更新失败。"


func schedule_draw() -> void:
	if not redraw_queued:
		redraw_queued = true
		draw_view.call_deferred()


func draw_view() -> void:
	redraw_queued = false
	for child in get_children():
		remove_child(child)
		child.queue_free()
	var margins := MarginContainer.new()
	margins.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margins.add_theme_constant_override("margin_" + side, 16)
	add_child(margins)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margins.add_child(scroll)
	page = VBoxContainer.new()
	page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page.add_theme_constant_override("separation", 12)
	scroll.add_child(page)

	add_label("废柴仙途", 31, COLORS.gold)
	if error_text:
		add_label(error_text, 16, COLORS.red)
	if not view.get("started", false):
		draw_title()
		return

	add_label(view["date"] + " · " + view["name"], 15, COLORS.muted)
	add_label(view["realm"] + "   修为 " + view["xp"] + " / " + view["xpNeed"], 17)
	add_label("战力 " + view["power"] + "    灵石 " + view["stones"], 17, COLORS.jade)

	var notice = view.get("notice")
	if notice is Dictionary:
		draw_notice(notice)
		return
	if view["panel"] is Dictionary:
		draw_management(view["panel"])
		return
	if show_maps:
		draw_maps()
		return
	if show_journey:
		draw_journey()
		return
	if show_saves:
		draw_saves()
		return
	draw_cave()


func draw_title() -> void:
	var texture := preload("res://art/chapter.png")
	add_picture(texture, 210)
	var name_input := LineEdit.new()
	name_input.placeholder_text = "道号"
	name_input.max_length = 6
	name_input.custom_minimum_size.y = 48
	page.add_child(name_input)
	add_button("踏入仙途  ▸", func(): request({"op": "new", "name": name_input.text}), true)
	if show_saves:
		draw_saves()
	else:
		add_button("导入存档", toggle_saves)


func draw_cave() -> void:
	var season := ["春", "夏", "秋", "冬"].find(String(view["date"]).right(1))
	add_picture(HOME_ART[maxi(season, 0)], 238)
	add_label(view["goal"], 23, COLORS.gold)
	add_label(view["progress"], 16)
	add_label("下一步 · " + view["advice"], 15, COLORS.muted)
	add_label("行动点  " + str(view["ap"]) + " / " + str(view["apTotal"]), 16, COLORS.gold)
	add_button("历练", open_maps, true)
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	page.add_child(actions)
	add_button("打坐 ◆1", func(): action("sit"), false, view["ap"] < 1, actions)
	if view["canRetreat"]:
		add_button("闭关 ◆2", func(): action("retreat"), false, view["ap"] < 2, actions)
	if view["array"] is Dictionary:
		var formation: Dictionary = view["array"]
		var upgrade := "聚灵阵 Lv%d" % int(formation["level"])
		if formation["max"]:
			upgrade += " · 已满级"
		else:
			upgrade += " · 升级 " + formation["cost"] + " 灵石"
		add_button(upgrade, func(): request({"op": "upgrade-array"}), false, not formation["available"])
	if not view["mainActions"].is_empty():
		add_button("主线行动", toggle_journey)
	if view["canBreak"]:
		add_button("突破", func(): request({"op": "break"}), true)
	add_button("下一季  ▸", func(): request({"op": "season"}), true)
	var systems := HBoxContainer.new()
	systems.add_theme_constant_override("separation", 6)
	page.add_child(systems)
	for id in PANELS:
		add_button(PANELS[id], func(): request({"op": "panel", "panel": id}), false, false, systems)
	add_button("存档", toggle_saves)


func draw_maps() -> void:
	if selected_map >= 0:
		for location in view["maps"]:
			if int(location["k"]) == selected_map:
				draw_map(location)
				return
	add_label("外出历练", 24, COLORS.gold)
	for entry in view["realms"]:
		var realm_args := [entry["xf"]]
		add_button(entry["label"] + "  ◆%d" % int(entry["ap"]), func(): start_trip("realm", realm_args), true, not String(entry["why"]).is_empty())
		if entry["why"]:
			add_label(entry["why"], 14, COLORS.muted)
	for location in view["maps"]:
		var index: int = location["k"]
		add_button(location["name"] + "  ▸", func():
			selected_map = index
			schedule_draw()
		, true)
	add_button("返回洞府", open_maps)


func draw_map(location: Dictionary) -> void:
	add_label(location["name"], 24, COLORS.gold)
	var boss = location.get("boss")
	if boss is Dictionary:
		var target := {"k": location["k"]}
		add_button("讨伐" + boss["name"] + " ◆1", func():
			show_maps = false
			selected_map = -1
			request({"op": "act", "action": "boss", "args": target})
		, true, not String(boss["why"]).is_empty())
		if boss["why"]:
			add_label(boss["why"], 14, COLORS.muted)
	for cell in location["cells"]:
		var args := [location["k"], cell["d"], cell["a"]]
		add_label(cell["label"] + " · " + cell["estimate"], 17)
		add_label("约 " + cell["stones"] + " 灵石 · 负伤 " + cell["risk"], 15, COLORS.muted)
		var actions := HBoxContainer.new()
		page.add_child(actions)
		add_button("出发 ◆2", func(): start_trip("exp", args), true, not cell["available"], actions)
		if cell["sweep"]:
			add_button("扫荡 ◆1", func(): start_trip("sweep", args), false, false, actions)
	add_button("返回地点", func():
		selected_map = -1
		schedule_draw()
	)


func draw_journey() -> void:
	add_label(view["goal"], 24, COLORS.gold)
	add_label(view["progress"], 16)
	for entry in view["mainActions"]:
		var label: String = entry["label"]
		if int(entry["ap"]) > 0:
			label += " ◆%d" % int(entry["ap"])
		var message := {"op": "act", "action": entry["id"], "args": entry.get("args")}
		add_button(label, func(): request(message), true, not entry["available"])
		if entry["why"]:
			add_label(entry["why"], 15, COLORS.muted)
	add_button("返回洞府", toggle_journey)


func draw_management(panel: Dictionary) -> void:
	add_label(PANELS[panel["id"]], 24, COLORS.gold)
	add_button("返回洞府", func(): request({"op": "panel"}))
	for entry in panel["entries"]:
		add_label(entry["title"], 19, COLORS.jade)
		if entry["text"]:
			add_label(entry["text"], 15)
		for option in entry["buttons"]:
			var message := {"op": "panel-action", "action": option["name"], "args": option["args"]}
			add_button(option["label"], func(): request(message), not option["why"], not String(option["why"]).is_empty())
			if option["why"]:
				add_label(option["why"], 14, COLORS.muted)


func draw_saves() -> void:
	add_label("存档", 22, COLORS.gold)
	if view.get("started", false):
		add_button("生成导出码", func(): request({"op": "export"}))
	var field := TextEdit.new()
	field.placeholder_text = "粘贴由游戏导出的存档"
	field.text = share_code
	field.custom_minimum_size.y = 112
	page.add_child(field)
	add_button("导入", func():
		show_saves = false
		request({"op": "import", "code": field.text})
	, true)
	add_button("返回", toggle_saves)


func draw_notice(notice: Dictionary) -> void:
	if notice.get("kind") == "battle":
		draw_battle(notice)
		return
	if notice.get("kind") == "realm":
		draw_realm(notice)
		return
	add_label(notice.get("title", ""), 25, COLORS.gold)
	var next_key := String(notice.get("key", ""))
	if next_key != dialogue_key:
		dialogue_key = next_key
		dialogue_index = 0
	var scene := String(notice.get("scene", ""))
	var scene_path := "res://art/story-" + scene + ".png"
	if not scene.is_empty() and ResourceLoader.exists(scene_path):
		add_picture(load(scene_path), 210)
	var lines: Array = notice.get("dialogue", [])
	if dialogue_index < lines.size():
		var line: Dictionary = lines[dialogue_index]
		if line["speaker"]:
			add_label(line["speaker"], 15, COLORS.jade)
		add_label(line["text"], 20)
		add_button("继续  ▸", func():
			dialogue_index += 1
			schedule_draw()
		, true)
		if dialogue_index + 1 < lines.size():
			add_button("跳过台词", func():
				dialogue_index = lines.size()
				schedule_draw()
			)
		return
	if not String(notice.get("text", "")).is_empty():
		add_label(notice["text"], 17)
	if notice.get("kind") == "choice":
		for option in notice["options"]:
			var index: int = option["index"]
			add_button(option["label"], func(): request({"op": "pick", "index": index}), false, not option["available"])
	else:
		add_button(notice.get("button", "继续  ▸"), func(): request({"op": "advance"}), true)


func draw_battle(battle: Dictionary) -> void:
	add_label(battle["title"] + " · 第 %d 轮" % int(battle["round"]), 24, COLORS.gold)
	for foe in battle["foes"]:
		var target := String(foe["name"])
		if foe["charge"]:
			target += " · 蓄力"
		if int(foe["shield"]) > 0:
			target += " · 护罩 %d" % int(foe["shield"])
		add_gauge(target, foe["hp"], foe["maxHp"], COLORS.red)
	add_gauge("气血", battle["hp"], battle["maxHp"], COLORS.jade)
	add_gauge("怒气", battle["rage"], 100, COLORS.gold)
	if battle["text"]:
		add_label(battle["text"], 15, COLORS.muted)
	add_button("下一轮  ▸", func(): request({"op": "combat", "move": "next"}), true)
	var actions := HBoxContainer.new()
	page.add_child(actions)
	add_button(battle["ultimate"], func(): request({"op": "combat", "move": "ult"}), false, not battle["canUlt"], actions)
	add_button("服丹", func(): request({"op": "combat", "move": "pill"}), false, int(battle["pills"]) == 0, actions)
	add_button("撤退", func(): request({"op": "combat", "move": "flee"}), false, false, actions)
	add_button("托管本场", func(): request({"op": "combat", "move": "smart"}))


func draw_realm(realm: Dictionary) -> void:
	add_label(realm["title"], 24, COLORS.gold)
	add_label(realm["text"], 16)
	add_gauge("气血", realm["hp"], realm["maxHp"], COLORS.jade)
	for option in realm["options"]:
		var message := {"op": "realm-action", "move": option["move"], "index": option["index"]}
		add_button(option["label"], func(): request(message), true, not String(option["why"]).is_empty())
		if option["why"]:
			add_label(option["why"], 14, COLORS.muted)


func add_gauge(title: String, value: float, maximum: float, tint: Color) -> void:
	add_label("%s  %d / %d" % [title, int(value), int(maximum)], 16, tint)
	var bar := ProgressBar.new()
	bar.max_value = maximum
	bar.value = value
	bar.show_percentage = false
	bar.custom_minimum_size.y = 12
	var fill := StyleBoxFlat.new()
	fill.bg_color = tint
	bar.add_theme_stylebox_override("fill", fill)
	page.add_child(bar)


func open_maps() -> void:
	show_maps = not show_maps
	selected_map = -1
	schedule_draw()


func start_trip(id: String, args: Array) -> void:
	show_maps = false
	selected_map = -1
	request({"op": "act", "action": id, "args": args})


func action(id: String) -> void:
	request({"op": "act", "action": id})


func toggle_saves() -> void:
	show_saves = not show_saves
	schedule_draw()


func toggle_journey() -> void:
	show_journey = not show_journey
	schedule_draw()


func add_picture(texture: Texture2D, height: int) -> void:
	var picture := TextureRect.new()
	picture.texture = texture
	picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	picture.custom_minimum_size.y = height
	page.add_child(picture)


func add_label(text: String, font_size: int, tint: Color = COLORS.text) -> void:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_color_override("font_color", tint)
	label.add_theme_font_size_override("font_size", font_size)
	page.add_child(label)


func add_button(text: String, callback: Callable, primary := false, disabled := false, parent: Container = null) -> void:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 48
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.disabled = disabled
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#80552d") if primary else Color("#27213a")
	style.border_color = Color("#d2a369") if primary else Color("#524461")
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	button.add_theme_stylebox_override("normal", style)
	button.pressed.connect(callback)
	(parent if parent != null else page).add_child(button)
