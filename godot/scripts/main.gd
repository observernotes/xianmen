extends Control

const SAVE_PATH := "user://xiantu.json"
const AUTO_SLOTS := [SAVE_PATH, "user://xiantu-a2.json", "user://xiantu-a3.json"]
const MANUAL_SLOTS := ["user://xiantu-m1.json", "user://xiantu-m2.json", "user://xiantu-m3.json"]
const RULES_PATH := "res://data/rules.js"
const FONT := preload("res://art/fusion-pixel.ttf")
const AUDIO := preload("res://scripts/game_audio.gd")
const BATTLE_SCENE := preload("res://scripts/battle_scene.gd")
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
const HOME_PANELS := {"home": "经营洞府", "formations": "阵法", "fields": "灵田", "alchemy": "炼丹", "pets": "灵宠"}
const SECT_PANELS := {"sect": "宗门", "sectVault": "宝库", "sectElders": "长老与职司", "disciples": "门下"}
const MARKET_PANELS := {"market": "货架与行情", "auction": "拍卖会"}
const EQUIPMENT_PANELS := {"equipment": "法宝", "forge": "炼器"}
const RECORD_PANELS := {"journal": "札记", "calendar": "历法", "rankings": "天骄榜", "codex": "图鉴"}

var runtime: Object
var game_audio := AUDIO.new()
var view: Dictionary = {}
var current_save: Dictionary = {}
var page: VBoxContainer
var error_text := ""
var show_maps := false
var selected_map := -1
var show_drops := false
var show_journey := false
var show_saves := false
var share_code := ""
var redraw_queued := false
var dialogue_key := ""
var dialogue_index := 0
var rebirth_tab := 0
var scroll: ScrollContainer
var page_key := ""


func _ready() -> void:
	add_child(game_audio)
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
	if runtime == null or redraw_queued:
		return
	var result = JSON.parse_string(runtime.request(JSON.stringify(message, "", false, true)))
	if not result is Dictionary:
		error_text = runtime.get_last_error()
	elif not result.get("ok", false):
		error_text = result.get("error", "无法完成操作")
	else:
		error_text = ""
		view = result.get("view", {})
		play_feedback(message)
		if result.get("save") != null and message["op"] != "export":
			var replacing: bool = message["op"] in ["load", "import", "new"] and not current_save.is_empty()
			update_auto_save(result["save"], replacing)
		if message["op"] == "export":
			share_code = result.get("result", "")
		elif message["op"] in ["import", "load"]:
			show_saves = false
			share_code = ""
		if message["op"] in ["new", "import", "load"]:
			dialogue_key = ""
			dialogue_index = 0
	schedule_draw()


func read_save(path: String) -> Dictionary:
	if FileAccess.file_exists(path):
		var decoded = JSON.parse_string(FileAccess.get_file_as_string(path))
		if decoded is Dictionary and decoded.get("state") is Dictionary and decoded["state"].get("p") is Dictionary:
			if not decoded.get("summary") is Dictionary:
				decoded.erase("summary")
			return decoded
	return {}


func store_save(save: Dictionary, path: String) -> bool:
	var temporary := path + ".tmp"
	var out := FileAccess.open(temporary, FileAccess.WRITE)
	if out == null:
		return false
	out.store_string(JSON.stringify(save, "", false, true))
	out.flush()
	var write_error := out.get_error()
	out.close()
	if write_error != OK:
		return false
	var absolute_source := ProjectSettings.globalize_path(temporary)
	var absolute_target := ProjectSettings.globalize_path(path)
	return DirAccess.rename_absolute(absolute_source, absolute_target) == OK


func update_auto_save(save: Dictionary, replacing: bool) -> void:
	var previous := read_save(SAVE_PATH)
	var last_summary: Dictionary = previous.get("summary", {})
	var next_summary: Dictionary = save.get("summary", {})
	var overwriting_checkpoint: bool = last_summary.get("key", false) and (
		not next_summary.get("key", false) or next_summary.get("tick") != last_summary.get("tick")
	)
	var backup_ok := true
	if not previous.is_empty() and (replacing or overwriting_checkpoint):
		var second := read_save(AUTO_SLOTS[1])
		if not second.is_empty():
			backup_ok = store_save(second, AUTO_SLOTS[2])
		if backup_ok:
			if replacing:
				previous["summary"] = last_summary.duplicate()
				previous["summary"]["why"] = "读档前"
			backup_ok = store_save(previous, AUTO_SLOTS[1])
	current_save = save
	if not backup_ok or not store_save(save, SAVE_PATH):
		error_text = "本地存档更新失败。"


func schedule_draw() -> void:
	if not redraw_queued:
		redraw_queued = true
		draw_view.call_deferred()


func draw_view() -> void:
	redraw_queued = false
	var notice = view.get("notice")
	if not notice is Dictionary or not notice.has("dialogue"):
		dialogue_key = ""
		dialogue_index = 0
	game_audio.music(scene_music(notice))
	var next_page_key := ""
	if notice is Dictionary:
		next_page_key = String(notice.get("key", notice["kind"]))
	elif view.get("panel") is Dictionary:
		next_page_key = "panel:" + String(view["panel"]["id"])
	elif show_saves:
		next_page_key = "saves"
	elif show_maps and selected_map >= 0:
		next_page_key = "drops" if show_drops else "map"
	var scroll_position := 0
	if is_instance_valid(scroll) and not next_page_key.is_empty() and next_page_key == page_key:
		scroll_position = scroll.scroll_vertical
	page_key = next_page_key
	for child in get_children():
		if child == game_audio:
			continue
		remove_child(child)
		child.queue_free()
	var margins := MarginContainer.new()
	margins.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margins.add_theme_constant_override("margin_" + side, 16)
	add_child(margins)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.scroll_deadzone = 8
	margins.add_child(scroll)
	page = VBoxContainer.new()
	page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page.add_theme_constant_override("separation", 12)
	scroll.add_child(page)
	if scroll_position > 0:
		scroll.set_deferred("scroll_vertical", scroll_position)

	add_label("废柴仙途", 31, COLORS.gold)
	if error_text:
		add_label(error_text, 16, COLORS.red)
	if not view.get("started", false):
		draw_title()
		return

	add_label(view["date"] + " · " + view["name"], 15, COLORS.muted)
	add_label(view["realm"] + "   修为 " + view["xp"] + " / " + view["xpNeed"], 17)
	add_label("战力 " + view["power"] + "    灵石 " + view["stones"], 17, COLORS.jade)

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


func scene_music(notice: Variant) -> String:
	if notice is Dictionary:
		var track := String(notice.get("music", ""))
		if not track.is_empty() and game_audio.stream_for("bgm_" + track):
			return track
		match notice["kind"]:
			"battle":
				return "boss" if notice["boss"] else "road_fight"
			"duel-prep":
				return "battle"
			"travel":
				return "road"
			"breakthrough":
				return "trib" if notice["trib"] else "home"
			"realm":
				return "realm"
			"life":
				return "ascend" if notice["mode"] == "ascend" else "sorrow"
			"rebirth":
				return "fate"
	if view.get("panel") is Dictionary and view["panel"]["id"] in ["market", "auction"]:
		return "town"
	return "home"


func play_feedback(message: Dictionary) -> void:
	var notice = view.get("notice")
	if message["op"] == "combat" and notice is Dictionary and notice["kind"] == "battle":
		var effects: Array = notice["effects"]
		if notice["done"]:
			game_audio.effect("victory" if notice["outcome"] == "取胜" else "defeat")
		elif not effects.is_empty():
			var effect: String = effects[0]["kind"]
			game_audio.effect(effect if effect in ["ult", "heavy", "hit"] else "hurt" if effect == "fhit" else "hit")
	elif message["op"] == "result" and message["move"] in ["all", "reveal"]:
		var index := int(message.get("index", 0)) % 3
		game_audio.effect("flip_%d-%d" % [index, index])
	elif message["op"] == "breakthrough" and message["move"] == "confirm" and notice is Dictionary:
		if notice["kind"] == "breakthrough" and notice["active"]:
			game_audio.effect("thunder")
		elif notice["title"] in ["突破成功", "突破失败"]:
			game_audio.effect("victory" if notice["title"] == "突破成功" else "defeat")


func draw_audio_setting() -> void:
	add_button("声音 · " + AUDIO.MODES[game_audio.mode], func():
		game_audio.cycle_mode()
		schedule_draw()
	)


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
		add_button("存档", toggle_saves)
	draw_audio_setting()


func draw_cave() -> void:
	var season := ["春", "夏", "秋", "冬"].find(String(view["date"]).right(1))
	add_picture(HOME_ART[maxi(season, 0)], 238)
	add_label(view["goal"], 23, COLORS.gold)
	add_label(view["progress"], 16)
	add_label("下一步 · " + view["advice"], 15, COLORS.muted)
	if view["visitor"] is Dictionary:
		var visitor: Dictionary = view["visitor"]
		add_button("洞府来访 · " + visitor["title"], func(): request({"op": "visitor"}), true)
		add_label("访客将在" + visitor["leave"] + "后离开", 14, COLORS.muted)
	if not view["ascended"]:
		add_label("行动点  %d / %d" % [int(view["ap"]), int(view["apTotal"])], 16, COLORS.gold)
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
	if not view["ascended"] and not view["mainActions"].is_empty():
		add_button("主线行动", toggle_journey)
	if view["canBreak"]:
		add_button("突破", func(): request({"op": "break"}), true)
	if not view["ascended"]:
		add_button("下一季  ▸", func(): request({"op": "season"}), true)
	var systems := HBoxContainer.new()
	systems.add_theme_constant_override("separation", 6)
	page.add_child(systems)
	for id in PANELS:
		add_button(PANELS[id], func(): request({"op": "panel", "panel": id}), false, false, systems)
	add_button("经营洞府", func(): request({"op": "panel", "panel": "home"}))
	add_button("人物羁绊", func(): request({"op": "panel", "panel": "people"}))
	add_button("仙途札记", func(): request({"op": "panel", "panel": "journal"}))
	if view["canReturnToGate"]:
		add_button("再登天门", func(): request({"op": "life", "move": "gate"}))
	if view["canRebirth"]:
		var label := "再入轮回" if view["ascended"] else "兵解转世"
		add_button(label, confirm_rebirth)
	add_button("存档", toggle_saves)
	draw_audio_setting()


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
	if show_drops:
		draw_drops(location)
		return
	add_button("掉落一览", func():
		show_drops = true
		schedule_draw()
	)
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


func draw_drops(location: Dictionary) -> void:
	add_button("返回历练", func():
		show_drops = false
		schedule_draw()
	)
	var wish = view.get("wish")
	if wish is Dictionary:
		add_label("当前心愿 · %s · %d / %d" % [wish["c"]["n"], int(wish["n"]), int(wish["max"])], 16, COLORS.gold)
		add_button("取消心愿", func(): request({"op": "wish", "clear": true}))
	elif not view["wishOpen"]:
		add_label("历练四趟后可以许愿。", 14, COLORS.muted)
	for depth in location["drops"]:
		add_label(depth["title"], 19, COLORS.gold)
		for item in depth["items"]:
			add_label(item["title"], 17)
			add_label(item["text"], 14, COLORS.muted)
			if view["wishOpen"]:
				var message := {"op": "wish", "k": location["k"], "d": depth["d"], "index": item["index"]}
				add_button("已设心愿" if item["pinned"] else "设为心愿", func(): request(message), false, item["pinned"])


func draw_journey() -> void:
	add_label(view["goal"], 24, COLORS.gold)
	add_label(view["progress"], 16)
	for entry in view["mainActions"]:
		var label: String = entry["label"]
		if int(entry["ap"]) > 0:
			label += " ◆%d" % int(entry["ap"])
		var command := "duel-prepare" if entry.get("id") in ["duel", "final"] else "act"
		var message := {"op": command, "action": entry.get("id"), "args": entry.get("args")}
		add_button(label, func():
			show_journey = false
			request(message)
		, true, not entry["available"])
		if entry["why"]:
			add_label(entry["why"], 15, COLORS.muted)
	add_button("返回洞府", toggle_journey)


func draw_management(panel: Dictionary) -> void:
	var active_id: String = panel["id"]
	var tabs: Dictionary = {}
	for group in [HOME_PANELS, SECT_PANELS, MARKET_PANELS, EQUIPMENT_PANELS, RECORD_PANELS]:
		if group.has(active_id):
			tabs = group
			break
	if active_id.begins_with("codex:"):
		add_button("返回图鉴", func(): request({"op": "panel", "panel": "codex"}))
	else:
		add_label(tabs.get(active_id, PANELS.get(active_id, "人物羁绊")), 24, COLORS.gold)
		add_button("返回洞府", func(): request({"op": "panel"}))
	if not tabs.is_empty():
		var tab_row := HBoxContainer.new()
		page.add_child(tab_row)
		for id in tabs:
			var label := "建筑" if id == "home" else String(tabs[id])
			add_button(label, func(): request({"op": "panel", "panel": id}), id == active_id, id == active_id, tab_row)
	if active_id == "people" and view["visitor"] is Dictionary:
		add_button("接见访客 · " + view["visitor"]["title"], func(): request({"op": "visitor"}))
	for entry in panel["entries"]:
		add_label(entry["title"], 19, COLORS.jade)
		if entry["text"]:
			add_label(entry["text"], 15)
		for option in entry["buttons"]:
			if option.has("duel"):
				var duel := {"op": "duel-prepare", "action": "duel", "args": option["duel"]}
				add_button(option["label"], func(): request(duel), true, not String(option["why"]).is_empty())
				if option["why"]:
					add_label(option["why"], 14, COLORS.muted)
				continue
			if option.has("panel"):
				var target: String = option["panel"]
				add_button(option["label"], func(): request({"op": "panel", "panel": target}))
				continue
			var message := {"op": "panel-action", "action": option["name"], "args": option["args"]}
			var warning := String(option.get("confirm", ""))
			add_button(option["label"], func():
				if warning.is_empty():
					request(message)
				else:
					confirm_action(entry["title"], warning, option["label"], message)
			, not option["why"], not String(option["why"]).is_empty())
			if option["why"]:
				add_label(option["why"], 14, COLORS.muted)


func draw_saves() -> void:
	add_label("存档", 22, COLORS.gold)
	add_button("返回", toggle_saves)
	for index in AUTO_SLOTS.size():
		draw_save_slot(AUTO_SLOTS[index], "自动 %d" % (index + 1), false)
	for index in MANUAL_SLOTS.size():
		draw_save_slot(MANUAL_SLOTS[index], "手动 %d" % (index + 1), true)
	if view.get("started", false):
		add_button("生成导出码", func(): request({"op": "export"}))
		if share_code.begins_with("XT1."):
			add_button("复制存档码", func(): DisplayServer.clipboard_set(share_code))
	var field := TextEdit.new()
	field.placeholder_text = "粘贴由游戏导出的存档"
	field.text = share_code
	field.custom_minimum_size.y = 112
	page.add_child(field)
	add_button("导入", func():
		share_code = field.text
		var message := {"op": "import", "code": share_code}
		if current_save.is_empty():
			request(message)
		else:
			confirm_action("导入存档", "当前进度会备份到自动 2。", "导入", message)
	, true)


func draw_save_slot(path: String, title: String, manual: bool) -> void:
	var saved := read_save(path)
	var exists := FileAccess.file_exists(path)
	var summary: Dictionary = saved.get("summary", {})
	var player: Dictionary = saved.get("state", {}).get("p", {})
	add_label(title, 18, COLORS.jade)
	if saved.is_empty():
		add_label("存档无法读取" if exists else "空", 15, COLORS.muted)
	else:
		var name := String(summary.get("name", player.get("name", "")))
		var detail := [name, String(summary.get("realm", ""))]
		if summary.has("y"):
			detail.append("第 %d 年" % int(summary["y"]))
		if summary.get("why", ""):
			detail.append(String(summary["why"]))
		add_label(" · ".join(detail.filter(func(part): return not String(part).is_empty())), 15)
	var buttons := HBoxContainer.new()
	page.add_child(buttons)
	if manual and not current_save.is_empty():
		add_button("保存", func():
			if exists:
				confirm_action(title, "覆盖这份手动存档？", "覆盖", {"op": "write-slot", "path": path})
			else:
				write_manual_slot(path)
		, true, false, buttons)
	if not saved.is_empty() and (manual or path != SAVE_PATH or current_save.is_empty()):
		add_button("读取", func():
			var message := {"op": "load", "save": JSON.stringify(saved, "", false, true)}
			if current_save.is_empty():
				request(message)
			else:
				confirm_action(title, "当前进度会备份到自动 2。", "读取", message)
		, false, false, buttons)
	if manual and exists:
		add_button("删除", func():
			confirm_action(title, "删除这份手动存档？", "删除", {"op": "delete-slot", "path": path})
		, false, false, buttons)


func write_manual_slot(path: String) -> void:
	if MANUAL_SLOTS.has(path) and not current_save.is_empty():
		error_text = "" if store_save(current_save, path) else "手动存档写入失败。"
		schedule_draw()


func draw_notice(notice: Dictionary) -> void:
	if notice.get("kind") == "duel-prep":
		draw_duel_prep(notice)
		return
	if notice.get("kind") == "battle":
		draw_battle(notice)
		return
	if notice.get("kind") == "realm":
		draw_realm(notice)
		return
	if notice.get("kind") == "breakthrough":
		draw_breakthrough(notice)
		return
	if notice.get("kind") == "life":
		add_label(notice["title"], 25, COLORS.gold)
		add_label(notice["text"], 17)
		add_button("再入轮回", func(): request({"op": "life", "move": "settle"}), true)
		if notice["mode"] == "ascend":
			add_button("留在此世", func(): request({"op": "life", "move": "return"}))
		return
	if notice.get("kind") == "rebirth":
		draw_rebirth(notice)
		return
	if notice.get("kind") == "reforge":
		add_label(notice["title"], 25, COLORS.gold)
		add_label("原词条 · " + notice["old"], 17)
		add_label(("保底词条 · " if notice["pity"] else "新词条 · ") + notice["replacement"], 17)
		add_button("保留原词条", func(): request({"op": "reforge-keep", "replace": false}))
		add_button("换成新词条", func(): request({"op": "reforge-keep", "replace": true}), true)
		return
	add_label(notice.get("title", ""), 25, COLORS.gold)
	if notice.get("kind") == "travel":
		add_battle_scene(notice)
	var next_key := String(notice.get("key", ""))
	if next_key != dialogue_key:
		dialogue_key = next_key
		dialogue_index = 0
	var scene := String(notice.get("scene", ""))
	var scene_path := "res://art/chapter.png" if scene == "chapter" else "res://art/story-" + scene + ".png"
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
			if option["text"]:
				add_label(option["text"], 14, COLORS.muted)
		if notice.get("dismiss"):
			add_button(notice["dismiss"], func(): request({"op": "dismiss-event"}))
		if notice.get("gifts"):
			add_button("给访客送礼", func(): request({"op": "visitor-gifts"}))
	else:
		draw_result_options(notice)
		add_button(notice.get("button", "继续  ▸"), func(): request({"op": "advance"}), true)


func draw_duel_prep(prep: Dictionary) -> void:
	add_label(prep["title"], 25, COLORS.gold)
	if prep["opponent"]:
		add_label(prep["opponent"], 20, COLORS.jade)
	if prep["text"]:
		add_label(prep["text"], 17)
	if not prep["arts"].is_empty():
		add_label("备战战技", 18, COLORS.gold)
		for art in prep["arts"]:
			var label := ("已装配 · " if art["selected"] else "荐 · " if art["recommended"] else "") + String(art["label"])
			var message := {"op": "duel-action", "move": "equip", "art": art["id"]}
			add_button(label, func(): request(message), art["recommended"], art["selected"])
	for option in prep["options"]:
		var message := {"op": "duel-action", "move": option["move"]}
		var why := String(option.get("why", ""))
		add_button(option["label"], func(): request(message), option["move"] != "cancel", not why.is_empty())
		var detail := String(option.get("text", why))
		if not detail.is_empty():
			add_label(detail, 14, COLORS.muted)


func draw_result_options(notice: Dictionary) -> void:
	var cards: Array = notice.get("cards", [])
	if not cards.is_empty():
		add_label("归途翻牌", 19, COLORS.gold)
		var has_hidden := false
		for card in cards:
			if card["revealed"]:
				add_label(card["name"], 17, COLORS.jade)
			else:
				has_hidden = true
				var message := {"op": "result", "move": "reveal", "index": card["index"]}
				add_button("翻牌 %d" % (int(card["index"]) + 1), func(): request(message))
		if has_hidden:
			add_button("全部翻开", func(): request({"op": "result", "move": "all"}))
	var deeper = notice.get("deeper")
	if deeper is Dictionary:
		add_button("趁势深入 ◆%d" % int(deeper["ap"]), func(): request({"op": "result", "move": "deeper"}), false, not String(deeper["why"]).is_empty())
		if deeper["why"]:
			add_label(deeper["why"], 14, COLORS.muted)


func draw_breakthrough(form: Dictionary) -> void:
	add_label(form["title"], 25, COLORS.gold)
	add_label(form["text"], 17)
	if form["active"]:
		add_gauge("护体", form["shield"], 100, COLORS.jade)
	if int(form["pillMax"]) > 0:
		var count_label := "临阵吞丹" if form["active"] else "破境丹"
		add_label("%s %d / %d" % [count_label, int(form["pills"]), int(form["pillMax"])], 17)
		var pills := HBoxContainer.new()
		page.add_child(pills)
		add_button("−", func(): request({"op": "breakthrough", "move": "pill", "step": -1}), false, int(form["pills"]) == 0, pills)
		add_button("+", func(): request({"op": "breakthrough", "move": "pill", "step": 1}), false, form["pills"] >= form["pillMax"], pills)
	for aid in form["aids"]:
		var key: String = aid["key"]
		add_button(("✓ " if aid["selected"] else "") + aid["text"], func():
			request({"op": "breakthrough", "move": "aid", "key": key})
		, false, not String(aid["why"]).is_empty())
		add_label(aid["why"] if aid["why"] else aid["cost"], 14, COLORS.muted)
	var label := "迎接最后两道雷" if form["active"] else "引动天劫" if form["trib"] else "冲击筑基"
	add_button(label, func(): request({"op": "breakthrough", "move": "confirm"}), true)
	if not form["active"]:
		add_button("再等等", func(): request({"op": "breakthrough", "move": "cancel"}))


func confirm_rebirth() -> void:
	confirm_action("轮回", "结算这一世的道果，准备转世？", "进入轮回殿", {"op": "life", "move": "settle"})


func confirm_action(title: String, prompt: String, label: String, message: Dictionary) -> void:
	var dialog := ConfirmationDialog.new()
	dialog.title = title
	dialog.dialog_text = prompt
	dialog.ok_button_text = label
	dialog.cancel_button_text = "取消"
	add_child(dialog)
	dialog.confirmed.connect(func():
		dialog.queue_free()
		if message["op"] == "write-slot":
			write_manual_slot(message["path"])
		elif message["op"] == "delete-slot":
			if MANUAL_SLOTS.has(message["path"]):
				var removed := DirAccess.remove_absolute(ProjectSettings.globalize_path(message["path"]))
				error_text = "" if removed == OK else "手动存档删除失败。"
				schedule_draw()
		else:
			request(message)
	)
	dialog.canceled.connect(dialog.queue_free)
	dialog.popup_centered()


func draw_rebirth(form: Dictionary) -> void:
	add_label(form["title"], 25, COLORS.gold)
	add_label(form["text"], 17)
	var tabs := HBoxContainer.new()
	page.add_child(tabs)
	var categories := ["命格", "出身", "试炼", "加成", "传承"]
	for index in categories.size():
		add_button(categories[index], func():
			rebirth_tab = index
			scroll.scroll_vertical = 0
			schedule_draw()
		, rebirth_tab == index, false, tabs)
	if rebirth_tab == 0:
		for item in form["cards"]:
			var index: int = item["index"]
			add_button(item["label"], func(): request({"op": "life", "move": "card", "index": index}), item["selected"])
	elif rebirth_tab == 1:
		for item in form["origins"]:
			var id: String = item["id"]
			add_button(item["label"], func(): request({"op": "life", "move": "origin", "id": id}), item["selected"])
	elif rebirth_tab == 2:
		for item in form["trials"]:
			var id: String = item["id"]
			add_button(("✓ " if item["selected"] else "") + item["label"], func(): request({"op": "life", "move": "trial", "id": id}), item["selected"])
			add_label(item["text"], 14, COLORS.muted)
	elif rebirth_tab == 3:
		for item in form["hall"]:
			var id: String = item["id"]
			add_button(item["label"] + " · " + item["cost"] + " 道果", func():
				request({"op": "life", "move": "hall", "id": id})
			, false, not String(item["why"]).is_empty())
			add_label(item["text"] if not item["why"] else item["text"] + "\n" + item["why"], 14, COLORS.muted)
	elif form["legacy"].is_empty():
		add_label("这一世尚无可传承的功法、器灵或灵宠。", 16, COLORS.muted)
	else:
		for item in form["legacy"]:
			var message := {"op": "life", "move": item["move"], "id": item["id"]}
			add_button(("✓ " if item["selected"] else "") + item["label"], func(): request(message), item["selected"])
	add_button("投胎转世", func(): request({"op": "life", "move": "begin"}), true)


func draw_battle(battle: Dictionary) -> void:
	add_label(battle["title"] + " · 第 %d 轮" % int(battle["round"]), 24, COLORS.gold)
	add_battle_scene(battle)
	for foe in battle["foes"]:
		if foe["hp"] <= 0:
			continue
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
	if battle["done"]:
		add_label(battle["outcome"], 18, COLORS.gold)
		add_button("结算战斗", func(): request({"op": "advance"}), true)
		return
	add_button("下一轮  ▸", func(): request({"op": "combat", "move": "next"}), true)
	var actions := HBoxContainer.new()
	page.add_child(actions)
	add_button(battle["ultimate"], func(): request({"op": "combat", "move": "ult"}), false, not battle["canUlt"], actions)
	add_button("服丹", func(): request({"op": "combat", "move": "pill"}), false, int(battle["pills"]) == 0, actions)
	add_button("撤退", func(): request({"op": "combat", "move": "flee"}), false, false, actions)
	add_button("托管本场", func(): request({"op": "combat", "move": "smart"}))


func add_battle_scene(data: Dictionary) -> void:
	var backdrop := BATTLE_SCENE.new()
	backdrop.combat = data
	page.add_child(backdrop)


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
	show_drops = false
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
	button.mouse_filter = Control.MOUSE_FILTER_PASS
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
	button.pressed.connect(func():
		game_audio.effect("tap")
		callback.call()
	)
	(parent if parent != null else page).add_child(button)
