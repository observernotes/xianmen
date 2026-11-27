extends Control

const SAVE_PATH := "user://xiantu.json"
const AUTO_SLOTS := [SAVE_PATH, "user://xiantu-a2.json", "user://xiantu-a3.json"]
const MANUAL_SLOTS := ["user://xiantu-m1.json", "user://xiantu-m2.json", "user://xiantu-m3.json"]
const RULES_PATH := "res://data/rules.js"
const FONT := preload("res://art/fusion-pixel.ttf")
const AUDIO := preload("res://scripts/game_audio.gd")
const BATTLE_SCENE := preload("res://scripts/battle_scene.gd")
const DUEL_SCENE := preload("res://scripts/duel_scene.gd")
const LOOT_CARD := preload("res://scripts/loot_card.gd")
const REALM_SCENE := preload("res://scripts/realm_scene.gd")
const STORY_STAGE := preload("res://scripts/story_stage.gd")
const CINEMATIC_PLAYER := preload("res://scripts/cinematic_player.gd")
const ITEM_ICONS := preload("res://art/item-icons.png")
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
const EQUIPMENT_PANELS := {"equipment": "法宝", "forge": "炼器", "bag": "包裹"}
const RECORD_PANELS := {"journal": "札记", "calendar": "历法", "rankings": "天骄榜", "codex": "图鉴", "memories": "回忆"}
const GROWTH_PANELS := {"growth:goal": "目标", "growth:atk": "战力", "growth:cul": "修炼", "growth:inc": "灵石", "growth:bt": "突破"}
const PLAYER_PANELS := {
	"attributes": "属性", "dao": "道心与因果", "achievements": "成就与称号", "reports": "历年年报",
	"prep": "备战", "path": "仙途路径", "inbox": "纸鹤", "train": "老祖特训",
}
const INTRO_TEXT := [
	"天剑宗外门。\n“杂灵根也配修仙？滚出山门！”\n你被大师兄赵乾一脚踢下了山。",
	"同一天，婚约也被当众撕毁。\n“废物，你配不上慕容家。三年后落霞城论剑，你若敢来，我便让你输得心服口服。”\n“莫欺少年穷！三年之后，我必登台！”",
	"当夜，荒山破庙。\n一个废柴的逆天仙途，从这里开始。\n三年之约、天剑宗、天骄榜、宗门之巅——\n还有那九九天劫之后的，白日飞升。",
]
const HERO_NAMES := ["林逸尘", "沈青川", "陆长风", "叶知秋", "苏念白", "顾清寒", "江离", "温如玉", "秦慕白", "萧云舟"]

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
var show_settings := false
var save_page := ""
var import_draft := ""
var export_code := ""
var clipboard_notice := ""
var redraw_queued := false
var dialogue_key := ""
var dialogue_index := 0
var dialogue_history := false
var intro_page := -1
var intro_name := ""
var intro_cine_seen := false
var replay_cinema: Dictionary = {}
var rebirth_tab := 0
var scroll: ScrollContainer
var page_key := ""
var realm_transition: Dictionary = {}
var item_icons: Dictionary = {}
var battle_speed := 1
var confirm_idle_ap := false
var playback_remaining := 0.0
var playback_action: Dictionary = {}
var app_paused := false
var loot_flips: Array = []


func _ready() -> void:
	get_tree().set_quit_on_go_back(false)
	get_tree().root.go_back_requested.connect(go_back)
	add_child(game_audio)
	var config := ConfigFile.new()
	if config.load(AUDIO.SETTINGS) == OK:
		intro_cine_seen = config.get_value("presentation", "tuihun", false) == true
		battle_speed = 2 if config.get_value("presentation", "battle_speed", 1) == 2 else 1
		confirm_idle_ap = config.get_value("presentation", "confirm_idle_ap", false) == true
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	theme = Theme.new()
	theme.default_font = FONT
	theme.default_font_size = 16
	var icon_map = JSON.parse_string(FileAccess.get_file_as_string("res://art/item-icons.json"))
	if icon_map is Dictionary:
		item_icons = icon_map
	if ClassDB.class_exists("XianmenRuntime"):
		runtime = ClassDB.instantiate("XianmenRuntime")
	if runtime == null or not FileAccess.file_exists(RULES_PATH):
		error_text = "缺少规则运行库或游戏数据。"
	elif not runtime.load_program(FileAccess.get_file_as_string(RULES_PATH)):
		error_text = runtime.get_last_error()
	elif FileAccess.file_exists(SAVE_PATH):
		request({"op": "load", "save": FileAccess.get_file_as_string(SAVE_PATH)})
		if current_save.is_empty() and not error_text.is_empty():
			var fallback = JSON.parse_string(runtime.request('{"op":"view"}'))
			if fallback is Dictionary and fallback.get("ok"):
				view = fallback["view"]
			error_text = "自动 1 读不出来。可尝试读取自动 2 或自动 3。"
			show_saves = true
	else:
		request({"op": "view"})
	schedule_draw()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED:
		app_paused = true
	elif what == NOTIFICATION_APPLICATION_RESUMED:
		app_paused = false


func go_back() -> void:
	if redraw_queued:
		return
	if DisplayServer.virtual_keyboard_get_height() > 0:
		DisplayServer.virtual_keyboard_hide()
		var editor := get_viewport().gui_get_focus_owner()
		if editor is LineEdit or editor is TextEdit:
			editor.release_focus()
		return
	for child in get_children():
		if child is ConfirmationDialog and child.visible:
			child.hide()
			child.queue_free()
			return
	if not replay_cinema.is_empty():
		close_cinematic_replay()
		return
	var notice = view.get("notice")
	if not current_cinematic(notice).is_empty() or view.get("arena") is Dictionary or not realm_transition.is_empty():
		return
	if dialogue_history:
		close_dialogue_history()
		return
	if notice is Dictionary:
		if notice["kind"] == "breakthrough" and not notice["active"]:
			request({"op": "breakthrough", "move": "cancel"})
		elif notice["kind"] == "duel-prep" and notice["fight"] in ["duel", "final"]:
			request({"op": "duel-action", "move": "cancel"})
		return
	if show_saves:
		if save_page.is_empty():
			toggle_saves()
		else:
			close_save_transfer()
	elif show_settings:
		toggle_settings()
	elif view.get("panel") is Dictionary:
		close_management(view["panel"]["id"])
	elif show_drops:
		close_drops()
	elif selected_map >= 0:
		select_map(-1)
	elif show_maps:
		open_maps()
	elif show_journey:
		toggle_journey()
	elif not view.get("started", false) and intro_page >= 0:
		return_to_title()
	elif Engine.has_singleton("AndroidRuntime"):
		var activity = Engine.get_singleton("AndroidRuntime").getActivity()
		if activity != null:
			activity.moveTaskToBack(true)


func _process(delta: float) -> void:
	if playback_action.is_empty() or app_paused or redraw_queued:
		return
	# Keep the current controls alive until a tap or scroll gesture is released.
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		return
	var notice: Dictionary = view["notice"]
	playback_remaining -= minf(delta, 0.1) * playback_speed_for(notice)
	if playback_remaining <= 0:
		request(playback_action)


func request(message: Dictionary) -> void:
	if runtime == null or redraw_queued:
		return
	playback_action = {}
	loot_flips = []
	var result = JSON.parse_string(runtime.request(JSON.stringify(message, "", false, true)))
	if not result is Dictionary:
		error_text = runtime.get_last_error()
	elif not result.get("ok", false):
		error_text = result.get("error", "无法完成操作")
	else:
		error_text = ""
		var save = result.get("save")
		if save is Dictionary and message["op"] != "export":
			var replacing: bool = message["op"] in ["load", "import", "new"] and not current_save.is_empty()
			if not update_auto_save(save, replacing):
				error_text = "本地存档更新失败。"
				if replacing:
					var restored = JSON.parse_string(runtime.request(JSON.stringify({"op": "load", "save": current_save}, "", false, true)))
					if restored is Dictionary and restored.get("ok"):
						error_text = "进度备份或写入失败，已保留当前进度。"
					else:
						runtime = null
						error_text = "进度写入失败。重新打开游戏可从磁盘存档恢复。"
					schedule_draw()
					return
		var action_result = result.get("result")
		if action_result is Dictionary:
			loot_flips = action_result.get("lootFlips", [])
		if action_result is Dictionary and action_result.has("realmFx"):
			realm_transition = {"view": view["notice"], "effect": action_result["realmFx"]}
		if action_result is Dictionary and action_result.has("navigation"):
			show_maps = action_result["navigation"] in ["maps", "drops"]
			show_drops = action_result["navigation"] == "drops"
			show_journey = action_result["navigation"] == "journey"
			selected_map = int(action_result.get("region", -1))
		view = result.get("view", {})
		play_feedback(message)
		if message["op"] == "export":
			export_code = result.get("result", "")
			save_page = "export"
		if message["op"] in ["new", "import", "load", "title"]:
			show_saves = false
			show_settings = false
			save_page = ""
			import_draft = ""
			export_code = ""
			clipboard_notice = ""
			show_maps = false
			show_drops = false
			show_journey = false
			selected_map = -1
			intro_page = -1
			realm_transition.clear()
			replay_cinema.clear()
			dialogue_key = ""
			dialogue_index = 0
			dialogue_history = false
		var guide := guide_hint()
		if int(guide.get("step", -1)) in [1, 2] and not show_drops:
			show_maps = true
			selected_map = 0 if guide["step"] == 2 else -1
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


func archive_auto_save(save: Dictionary, reason := "") -> bool:
	var saved := save
	if not reason.is_empty():
		saved = save.duplicate()
		var heading: Dictionary = save.get("summary", {})
		saved["summary"] = heading.merged({"why": reason, "key": true}, true)
	var second := read_save(AUTO_SLOTS[1])
	if second == saved:
		return true
	if not second.is_empty() and not store_save(second, AUTO_SLOTS[2]):
		return false
	return store_save(saved, AUTO_SLOTS[1])


func update_auto_save(save: Dictionary, replacing: bool) -> bool:
	var previous := current_save if replacing else read_save(SAVE_PATH)
	var last_summary: Dictionary = previous.get("summary", {})
	var next_summary: Dictionary = save.get("summary", {})
	var overwriting_checkpoint: bool = last_summary.get("key", false) and (
		not next_summary.get("key", false) or next_summary.get("tick") != last_summary.get("tick")
	)
	var backup_ok := true
	if not previous.is_empty() and (replacing or overwriting_checkpoint):
		backup_ok = archive_auto_save(previous, "读档前" if replacing else "")
	var written := backup_ok and store_save(save, SAVE_PATH)
	if written or not replacing:
		current_save = save
	return written


func restart_game() -> void:
	if current_save.is_empty():
		return
	if not archive_auto_save(current_save, "重来前"):
		error_text = "备份未能写入，已保留当前进度。"
		schedule_draw()
		return
	if FileAccess.file_exists(SAVE_PATH) and DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH)) != OK:
		error_text = "无法清除当前自动档，已保留当前进度。"
		schedule_draw()
		return
	current_save = {}
	request({"op": "title"})


func schedule_draw() -> void:
	if not redraw_queued:
		redraw_queued = true
		draw_view.call_deferred()


func draw_view() -> void:
	redraw_queued = false
	playback_action = {}
	var notice = view.get("notice")
	if not notice is Dictionary or not notice.has("dialogue"):
		dialogue_key = ""
		dialogue_index = 0
		dialogue_history = false
	var cinema := current_cinematic(notice)
	var arena = view.get("arena")
	if cinema.is_empty():
		game_audio.music("battle" if arena is Dictionary else scene_music(notice))
	var next_page_key := ""
	if not cinema.is_empty():
		next_page_key = "cinema"
	elif arena is Dictionary:
		next_page_key = "arena"
	elif notice is Dictionary:
		next_page_key = String(notice.get("key", notice["kind"]))
	elif view.get("panel") is Dictionary:
		next_page_key = "panel:" + String(view["panel"]["id"])
	elif show_saves:
		next_page_key = "saves/" + save_page
	elif show_settings:
		next_page_key = "settings"
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
	if not cinema.is_empty():
		draw_cinematic(cinema)
		return
	if not view.get("started", false):
		draw_title()
		return
	if arena is Dictionary:
		draw_duel_arena(arena)
		return

	add_label(view["date"] + " · " + view["name"], 15, COLORS.muted)
	add_label(view["realm"] + "   修为 " + view["xp"] + " / " + view["xpNeed"], 17)
	add_label("战力 " + view["power"] + "    灵石 " + view["stones"], 17, COLORS.jade)

	if not realm_transition.is_empty():
		draw_realm(realm_transition["view"], realm_transition["effect"])
		return
	if notice is Dictionary:
		draw_notice(notice)
		if error_text.is_empty() and notice.get("delay", -1) >= 0:
			playback_remaining = notice["delay"] / 1000.0
			playback_action = {"op": "advance"} if notice["kind"] == "travel" or notice["done"] else {"op": "combat", "move": "tick"}
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
	if show_settings:
		draw_settings()
		return
	draw_cave()


func current_cinematic(notice: Variant) -> Dictionary:
	if not replay_cinema.is_empty():
		return replay_cinema
	if not view.get("started", false):
		var intro = view.get("introClip")
		if intro_page == 1 and not intro_cine_seen and intro is Dictionary:
			return intro
		return {}
	if not realm_transition.is_empty():
		return {}
	var before = view.get("cinema")
	if before is Dictionary:
		return before
	var after = view.get("cinemaAfter")
	if after is Dictionary and notice is Dictionary and not dialogue_history:
		var lines: Array = notice.get("dialogue", [])
		if lines.is_empty() or (notice.get("key", "") == dialogue_key and dialogue_index >= lines.size()):
			return after
	return {}


func draw_cinematic(clip: Dictionary) -> void:
	add_label(clip["title"], 24, COLORS.gold)
	var film := CINEMATIC_PLAYER.new()
	film.clip = clip
	film.music_cue.connect(game_audio.music)
	film.sound_cue.connect(game_audio.effect)
	film.completed.connect(func():
		if not replay_cinema.is_empty():
			close_cinematic_replay()
		elif clip.get("token") == "intro:tuihun":
			intro_cine_seen = true
			var config := ConfigFile.new()
			config.load(AUDIO.SETTINGS)
			config.set_value("presentation", "tuihun", true)
			config.save(AUDIO.SETTINGS)
			intro_page = 2
			schedule_draw()
		else:
			request({"op": "cinema-done", "token": clip["token"]})
	)
	page.add_child(film)


func close_cinematic_replay() -> void:
	replay_cinema.clear()
	schedule_draw()


func scene_music(notice: Variant) -> String:
	if not realm_transition.is_empty():
		return "realm"
	if notice is Dictionary:
		var lines: Array = notice.get("dialogue", [])
		var index := dialogue_index if notice.get("key", "") == dialogue_key else 0
		if index < lines.size() and lines[index].has("music"):
			var cue := String(lines[index]["music"])
			if cue.is_empty() or game_audio.stream_for("bgm_" + cue):
				return cue
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
	elif message["op"] == "result" and not loot_flips.is_empty():
		var cards: Array = notice.get("cards", [])
		if loot_flips.any(func(index): return int(cards[int(index)]["stars"]) >= 3):
			game_audio.effect("reveal_6")
		else:
			var index := int(loot_flips.back()) % 3
			game_audio.effect("flip_%d-%d" % [index, index])
	elif message["op"] == "result" and message["move"] == "gear" and message["decision"] != "keep":
		game_audio.effect("reveal_0")
	elif message["op"] == "breakthrough" and message["move"] == "confirm" and notice is Dictionary:
		if notice["kind"] == "breakthrough" and notice["active"]:
			game_audio.effect("thunder")
		elif notice["title"] in ["突破成功", "突破失败"]:
			game_audio.effect("victory" if notice["title"] == "突破成功" else "defeat")


func draw_settings() -> void:
	add_label("设置", 24, COLORS.gold)
	add_button("返回", toggle_settings)
	add_button("声音 · " + AUDIO.MODES[game_audio.mode], func():
		error_text = "" if game_audio.cycle_mode() else "无法保存声音设置。"
		schedule_draw()
	)
	draw_volume_controls("音乐", true)
	draw_volume_controls("音效", false)
	add_button("战斗速度 · ×%d" % battle_speed, cycle_battle_speed)
	var idle_ap_text := "先确认" if confirm_idle_ap else "直接打坐"
	add_button("过季剩余行动点 · " + idle_ap_text, func():
		confirm_idle_ap = not confirm_idle_ap
		save_presentation_setting("confirm_idle_ap", confirm_idle_ap)
	)
	add_button("存档", toggle_saves)


func draw_volume_controls(title: String, for_music: bool) -> void:
	add_label(title, 17, COLORS.jade)
	var levels := HBoxContainer.new()
	page.add_child(levels)
	var selected: int = game_audio.music_level if for_music else game_audio.effect_level
	for level in range(6):
		add_button(str(level), func():
			error_text = "" if game_audio.set_volume(for_music, level) else "无法保存音量。"
			if not for_music:
				game_audio.effect("tap")
			schedule_draw()
		, level == selected, false, levels)


func draw_title() -> void:
	if show_saves:
		draw_saves()
		return
	if show_settings:
		draw_settings()
		return
	if intro_page >= 0 and intro_page < INTRO_TEXT.size():
		add_picture(load("res://art/intro-%d.png" % intro_page), 224)
		add_label(INTRO_TEXT[intro_page], 18)
		add_button("继续  ▸", func():
			intro_page += 1
			schedule_draw()
		, true)
		add_button("跳过序章", func():
			intro_page = INTRO_TEXT.size()
			schedule_draw()
		)
		return
	if intro_page < 0:
		add_picture(preload("res://art/chapter.png"), 210)
		add_button("开始仙途  ▸", func():
			intro_page = 0
			intro_name = HERO_NAMES.pick_random()
			schedule_draw()
		, true)
		add_button("存档", toggle_saves)
		add_button("设置  ▸", toggle_settings)
		return
	add_label("踏上仙途", 24, COLORS.gold)
	var portrait := STORY_STAGE.portrait_texture("me-0|n|")
	if portrait:
		var preview := TextureRect.new()
		preview.texture = portrait
		preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		preview.custom_minimum_size.y = 144
		page.add_child(preview)
	var name_input := LineEdit.new()
	name_input.placeholder_text = "道号"
	name_input.text = intro_name
	name_input.text_changed.connect(func(value): intro_name = value)
	name_input.max_length = 6
	name_input.custom_minimum_size.y = 48
	page.add_child(name_input)
	add_button("换个名字", func():
		name_input.text = HERO_NAMES.filter(func(value): return value != name_input.text).pick_random()
		intro_name = name_input.text
	)
	add_button("踏入仙途  ▸", func():
		request({"op": "new", "name": intro_name if not intro_name.strip_edges().is_empty() else HERO_NAMES.pick_random(),
			"introSeen": intro_cine_seen})
	, true)
	add_button("返回标题", return_to_title)


func return_to_title() -> void:
	intro_page = -1
	schedule_draw()


func draw_cave() -> void:
	var season := ["春", "夏", "秋", "冬"].find(String(view["date"]).right(1))
	add_picture(HOME_ART[maxi(season, 0)], 238)
	var target := String(guide_hint().get("target", ""))
	match target:
		"trip":
			add_guide_button("历练", open_maps)
		"season":
			add_guide_button("下一季  ▸", next_season)
		"breakthrough":
			add_guide_button("突破", func(): request({"op": "break"}))
	add_label(view["goal"], 23, COLORS.gold)
	add_label(view["progress"], 16)
	if view["advice"]:
		add_label("下一步 · " + view["advice"], 15, COLORS.muted)
	var guidance := HBoxContainer.new()
	page.add_child(guidance)
	if view["advice"] and not view["ascended"]:
		var cost := int(view.get("adviceAp", 0))
		add_button("按建议行动" + (" ◆%d" % cost if cost else ""), func(): request({"op": "goal-next"}), true, false, guidance)
	add_button("变强", func(): request({"op": "panel", "panel": "growth:goal"}), false, false, guidance)
	var upcoming = view.get("upcoming")
	if upcoming is Dictionary:
		var due := "本季末" if int(upcoming["seasons"]) <= 1 else "还有 %d 季" % int(upcoming["seasons"])
		add_button(upcoming["n"] + " · " + due + "  ▸", func(): request({"op": "panel", "panel": "prep"}))
	var unread := int(view.get("mail", 0))
	add_button("纸鹤" + (" · %d 封" % unread if unread else ""), func(): request({"op": "panel", "panel": "inbox"}))
	if view["visitor"] is Dictionary:
		var visitor: Dictionary = view["visitor"]
		add_button("洞府来访 · " + visitor["title"], func(): request({"op": "visitor"}), true)
		add_label("访客将在" + visitor["leave"] + "后离开", 14, COLORS.muted)
	if not view["ascended"]:
		add_label("行动点  %d / %d" % [int(view["ap"]), int(view["apTotal"])], 16, COLORS.gold)
		if target != "trip":
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
	if view["canBreak"] and target != "breakthrough":
		add_button("突破", func(): request({"op": "break"}), true)
	if not view["ascended"] and target != "season":
		add_button("下一季  ▸", next_season, true)
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
	add_button("设置  ▸", toggle_settings)


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
		var label := String(location["name"]) + "  ▸"
		if index == 0 and guide_hint().get("target") == "region":
			add_guide_button(label, func(): select_map(index))
		else:
			add_button(label, func(): select_map(index), true)
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
		var trip_panel := "trip:%d:%d:%d" % args
		var prepare := func(): request({"op": "panel", "panel": trip_panel})
		if trip_panel == "trip:0:0:0" and guide_hint().get("target") == "prepare":
			add_guide_button("出发准备  ▸", prepare)
			continue
		var actions := HBoxContainer.new()
		page.add_child(actions)
		add_button("出发准备  ▸", prepare, true, false, actions)
		if cell["sweep"]:
			add_button("扫荡 ◆1", func(): start_trip("sweep", args), false, false, actions)
	add_button("返回地点", func(): select_map(-1))


func draw_drops(location: Dictionary) -> void:
	add_button("返回历练", close_drops)
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
		if entry.get("tripPanel"):
			message = {"op": "panel", "panel": entry["tripPanel"]}
		add_button(label, func():
			show_journey = false
			request(message)
		, true, not entry["available"])
		if entry["why"]:
			add_label(entry["why"], 15, COLORS.muted)
	add_button("返回洞府", toggle_journey)


func draw_management(panel: Dictionary) -> void:
	var active_id: String = panel["id"]
	var tabs: Dictionary = GROWTH_PANELS if active_id.begins_with("growth:") else {}
	for group in [HOME_PANELS, SECT_PANELS, MARKET_PANELS, EQUIPMENT_PANELS, RECORD_PANELS]:
		if group.has(active_id):
			tabs = group
			break
	if active_id.begins_with("codex:"):
		add_button("返回图鉴", func(): close_management(active_id))
	else:
		var title := String(tabs.get(active_id, PLAYER_PANELS.get(active_id, PANELS.get(active_id, "人物羁绊"))))
		if active_id.begins_with("growth:"):
			title = "变强"
		elif active_id.begins_with("trip:"):
			title = "出发准备"
		add_label(title, 24, COLORS.gold)
		add_button("返回" if active_id.begins_with("trip:") else "返回洞府", func(): close_management(active_id))
	if not tabs.is_empty():
		var tab_row := HBoxContainer.new()
		page.add_child(tab_row)
		for id in tabs:
			var label := "建筑" if id == "home" else String(tabs[id])
			add_button(label, func(): request({"op": "panel", "panel": id}), id == active_id, id == active_id, tab_row)
	if active_id == "people" and view["visitor"] is Dictionary:
		add_button("接见访客 · " + view["visitor"]["title"], func(): request({"op": "visitor"}))
	for entry in panel["entries"]:
		draw_entry_title(entry)
		if entry["text"]:
			add_label(entry["text"], 15)
		if entry.get("meter") is Dictionary:
			add_forecast_meter(entry["meter"])
		for option in entry["buttons"]:
			if option.has("cine"):
				var clip: Dictionary = option["cine"]
				add_button(option["label"], func():
					replay_cinema = clip.duplicate(true)
					schedule_draw()
				)
				continue
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
			var perform := func():
				if warning.is_empty():
					request(message)
				else:
					confirm_action(entry["title"], warning, option["label"], message)
			var disabled := not String(option["why"]).is_empty()
			if option["name"] == "trip-go" and option["args"][0] == "exp" and guide_hint().get("target") == "depart":
				add_guide_button(option["label"], perform, disabled)
			else:
				add_button(option["label"], perform, option.get("primary", not disabled), disabled)
			if option["why"]:
				add_label(option["why"], 14, COLORS.muted)


func close_management(panel_id: String) -> void:
	if panel_id.begins_with("codex:"):
		request({"op": "panel", "panel": "codex"})
	elif guide_hint().get("target") == "depart":
		request({"op": "guide-nav", "region": -1})
	else:
		request({"op": "panel"})


func draw_entry_title(entry: Dictionary) -> void:
	var art = item_icons.get(entry.get("icon", ""))
	if not art is Array:
		add_label(entry["title"], 19, COLORS.gold if entry.get("section", false) else COLORS.jade)
		return
	var heading := HBoxContainer.new()
	heading.add_theme_constant_override("separation", 7)
	page.add_child(heading)
	var icon := TextureRect.new()
	var texture := AtlasTexture.new()
	texture.atlas = ITEM_ICONS
	texture.region = Rect2(float(art[0]), float(art[1]), 24, 24)
	texture.filter_clip = true
	icon.texture = texture
	heading.add_child(icon)
	add_label(entry["title"], 19, COLORS.jade, heading)


func add_forecast_meter(meter: Dictionary) -> void:
	var maximum := maxf(0.001, float(meter.get("max", 1)))
	var current := clampf(float(meter.get("value", 0)) / maximum, 0.0, 1.0)
	var projection := clampf(float(meter.get("after", 0)) / maximum, current, 1.0)
	var target := clampf(float(meter.get("target", 0)) / maximum, 0.0, 1.0)
	var track := ColorRect.new()
	track.color = Color("#332a42")
	track.custom_minimum_size.y = 10
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	page.add_child(track)
	meter_range(track, 0.0, current, COLORS.jade)
	if projection > current:
		meter_range(track, current, projection, COLORS.gold)
	if target > 0.0:
		meter_range(track, maxf(0.0, target - 0.004), target, Color.WHITE)


func meter_range(track: Control, start: float, end: float, tint: Color) -> void:
	var fill := ColorRect.new()
	fill.color = tint
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_child(fill)
	fill.set_anchor_and_offset(SIDE_RIGHT, end, 0.0)
	fill.set_anchor_and_offset(SIDE_LEFT, start, 0.0)
	fill.set_anchor_and_offset(SIDE_BOTTOM, 1.0, 0.0)


func draw_saves() -> void:
	add_label("存档", 22, COLORS.gold)
	if not save_page.is_empty():
		draw_save_transfer()
		return
	add_button("返回", toggle_saves)
	var transfer := HBoxContainer.new()
	page.add_child(transfer)
	add_button("导入存档", func():
		save_page = "import"
		clipboard_notice = ""
		schedule_draw()
	, true, false, transfer)
	if view.get("started", false):
		add_button("导出存档", func(): request({"op": "export"}), false, false, transfer)
	for index in AUTO_SLOTS.size():
		draw_save_slot(AUTO_SLOTS[index], "自动 %d" % (index + 1), false)
	for index in MANUAL_SLOTS.size():
		draw_save_slot(MANUAL_SLOTS[index], "手动 %d" % (index + 1), true)
	if view.get("started", false):
		add_button("重新开始", func():
			confirm_action("重新开始", "当前进度会移到自动 2，可随时读回。", "确定重来", {"op": "restart"})
		)


func draw_save_transfer() -> void:
	var exporting := save_page == "export"
	add_label("导出存档" if exporting else "导入存档", 20, COLORS.jade)
	add_button("返回存档", close_save_transfer)
	var field := TextEdit.new()
	field.placeholder_text = "XT1. …"
	field.text = export_code if exporting else import_draft
	field.editable = not exporting
	field.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	field.custom_minimum_size.y = 180
	page.add_child(field)
	if exporting:
		add_button("复制存档码", func():
			var copied := export_code
			DisplayServer.clipboard_set(copied)
			await get_tree().create_timer(0.18).timeout
			if show_saves and save_page == "export" and export_code == copied:
				clipboard_notice = "已复制存档码。" if DisplayServer.clipboard_get() == copied else "剪贴板不可用，可手动选中存档码。"
				schedule_draw()
		, true, export_code.is_empty())
	else:
		field.text_changed.connect(func(): import_draft = field.text)
		add_button("粘贴存档码", func():
			var pasted := DisplayServer.clipboard_get().strip_edges()
			clipboard_notice = "剪贴板没有可粘贴的文字。" if pasted.is_empty() else ""
			if not pasted.is_empty():
				import_draft = pasted
				error_text = ""
			schedule_draw()
		)
		add_button("导入", func():
			import_draft = field.text
			var message := {"op": "import", "code": import_draft}
			if current_save.is_empty():
				request(message)
			else:
				confirm_action("导入存档", "当前进度会先备份到自动 2。", "导入", message)
		, true)
	if not clipboard_notice.is_empty():
		add_label(clipboard_notice, 15, COLORS.muted)


func close_save_transfer() -> void:
	save_page = ""
	clipboard_notice = ""
	error_text = ""
	schedule_draw()


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
		if summary.has("ch"):
			detail.append("第 %d 章" % (int(summary["ch"]) + 1))
		if summary.has("y"):
			detail.append("第 %d 年" % int(summary["y"]))
		if int(summary.get("life", 1)) > 1:
			detail.append("第 %d 世" % int(summary["life"]))
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
		var ending_art := STORY_STAGE.scene_texture(notice.get("scene", ""))
		if ending_art:
			add_picture(ending_art, 224)
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
	if notice.get("unlockLink"):
		draw_entry_title(notice)
		if notice.get("text"):
			add_label(notice["text"], 17)
		add_button("带我去  ▸", func(): request({"op": "unlock-go"}), true)
		add_button(notice["button"], func(): request({"op": "advance"}))
		return
	add_label(notice.get("title", ""), 25, COLORS.gold)
	if notice.get("kind") == "travel":
		add_battle_scene(notice)
		draw_trip_progress(notice["trip"])
		if notice["settingsOpen"]:
			add_speed_button()
	var next_key := String(notice.get("key", ""))
	if next_key != dialogue_key:
		dialogue_key = next_key
		dialogue_index = 0
		dialogue_history = false
	var lines: Array = notice.get("dialogue", [])
	if dialogue_history:
		add_button("返回剧情", close_dialogue_history, true)
		for past in lines.slice(0, mini(dialogue_index + 1, lines.size())):
			var speaker := String(past.get("speaker", ""))
			add_label((speaker + "\n" if speaker else "") + String(past["text"]), 17)
		return
	if dialogue_index < lines.size():
		var line: Dictionary = lines[dialogue_index]
		var stage := STORY_STAGE.new()
		stage.line = {"scene": notice.get("scene", "")}
		stage.line.merge(line, true)
		page.add_child(stage)
		if line.get("echo"):
			add_label("因为 " + String(line["echo"]), 14, COLORS.gold)
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
		if dialogue_index > 0:
			add_button("回看", func():
				dialogue_history = true
				schedule_draw()
			)
		return
	var scene := String(notice.get("scene", ""))
	if not lines.is_empty() and not lines.back().get("black", false):
		scene = String(lines.back().get("scene", scene))
	var background := STORY_STAGE.scene_texture(scene)
	if background:
		add_picture(background, 210)
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


func close_dialogue_history() -> void:
	dialogue_history = false
	schedule_draw()


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


func draw_duel_arena(arena: Dictionary) -> void:
	var index := int(arena["index"])
	var bout: Dictionary = arena["bouts"][index]
	add_label(arena["title"], 25, COLORS.gold)
	if bout.get("label"):
		add_label(bout["label"], 17, COLORS.muted)
	add_label("%s  对  %s" % [bout["left"]["name"], bout["right"]["name"]], 21, COLORS.text)
	var stage := DUEL_SCENE.new()
	stage.bout = bout
	var proceed := func(): request({"op": "duel-next", "index": index})
	stage.completed.connect(proceed)
	stage.sound_cue.connect(game_audio.effect)
	page.add_child(stage)
	add_label("战力 %s 对 %s · 胜算 %d%%" % [bout["left"]["power"], bout["right"]["power"],
		roundi(bout["chance"] * 100.0)], 16, COLORS.muted)
	add_button("跳过本场", proceed)


func draw_result_options(notice: Dictionary) -> void:
	var cards: Array = notice.get("cards", [])
	if not cards.is_empty():
		add_label("归途翻牌", 19, COLORS.gold)
		var row := HBoxContainer.new()
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		row.add_theme_constant_override("separation", 6)
		page.add_child(row)
		var has_hidden := false
		for card in cards:
			var tile := LOOT_CARD.new()
			tile.card = card
			var order := loot_flips.find(card["index"])
			if order >= 0:
				tile.flip_delay = order * 0.10
			if not card["revealed"]:
				var message := {"op": "result", "move": "reveal", "index": card["index"]}
				tile.pressed.connect(func(): request(message))
				tile.reveal_all.connect(func(): request({"op": "result", "move": "all"}))
				has_hidden = true
			row.add_child(tile)
		loot_flips.clear()
		if has_hidden:
			add_button("全部翻开", func(): request({"op": "result", "move": "all"}))
		for card in cards:
			if card["revealed"]:
				draw_loot_detail(card)
		if notice.get("wishAgain"):
			add_button("再钉一件  ▸", func(): request({"op": "result", "move": "wish-again"}))
	var deeper = notice.get("deeper")
	if deeper is Dictionary:
		add_button("趁势深入 ◆%d" % int(deeper["ap"]), func(): request({"op": "result", "move": "deeper"}), false, not String(deeper["why"]).is_empty())
		if deeper["why"]:
			add_label(deeper["why"], 14, COLORS.muted)


func draw_loot_detail(card: Dictionary) -> void:
	var heading := String(card["name"])
	if card["stars"] > 0:
		heading += "  " + "★".repeat(int(card["stars"]))
	add_label(heading, 17, COLORS.jade)
	if card.get("wish"):
		add_label("心愿达成", 15, COLORS.gold)
	if card.get("detail"):
		add_label(card["detail"], 14, COLORS.muted)
	if card.get("status"):
		add_label(card["status"], 14, COLORS.muted)
	var comparison = card.get("compare")
	if comparison is Dictionary:
		add_label(comparison["text"], 15, COLORS.text)
		if comparison["replacement"]:
			add_label(comparison["replacement"], 14, COLORS.muted)
		var choices := HBoxContainer.new()
		page.add_child(choices)
		var choice := {"op": "result", "move": "gear", "index": card["index"]}
		add_button("换上", func(): request(choice.merged({"decision": "equip"})), comparison["better"], false, choices)
		add_button("收下", func(): request(choice.merged({"decision": "keep"})), false, false, choices)
		add_button("熔炼 · 矿+" + comparison["smelt"], func(): request(choice.merged({"decision": "smelt"})), not comparison["better"], false, choices)


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
	dialog.get_ok_button().custom_minimum_size = Vector2(86, 48)
	dialog.get_cancel_button().custom_minimum_size = Vector2(86, 48)
	dialog.confirmed.connect(func():
		dialog.queue_free()
		if message["op"] == "write-slot":
			write_manual_slot(message["path"])
		elif message["op"] == "restart":
			restart_game()
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
	if battle["done"]:
		add_label(battle["outcome"], 18, COLORS.gold)
		add_button("结算战斗", func(): request({"op": "advance"}), true)
	else:
		var actions := HBoxContainer.new()
		page.add_child(actions)
		add_button(battle["ultimate"], func(): request({"op": "combat", "move": "ult"}), battle["canUlt"], not battle["canUlt"], actions)
		add_button("服丹 ×%d" % int(battle["pills"]), func(): request({"op": "combat", "move": "pill"}), false, int(battle["pills"]) == 0, actions)
		add_button("撤退", func(): request({"op": "combat", "move": "flee"}), false, false, actions)
		if battle["settingsOpen"]:
			var settings := HBoxContainer.new()
			page.add_child(settings)
			var auto_label := "自动绝招 · " + ("开" if battle["autoUlt"] else "关")
			add_button(auto_label, func(): request({"op": "battle-auto-ult"}), battle["autoUlt"], false, settings)
			add_speed_button(settings)
		if battle.get("hint"):
			add_label(battle["hint"], 16, COLORS.gold)
		if battle["delay"] < 0 or not error_text.is_empty():
			add_button("继续交手", func(): request({"op": "combat", "move": "next"}))
	add_gauge("气血", battle["hp"], battle["maxHp"], COLORS.jade)
	add_gauge("怒气", battle["rage"], 100, COLORS.gold)
	for foe in battle["foes"]:
		if foe["hp"] <= 0:
			continue
		var target := String(foe["name"])
		if foe["charge"]:
			target += " · 蓄力"
		if int(foe["shield"]) > 0:
			target += " · 护罩 %d" % int(foe["shield"])
		add_gauge(target, foe["hp"], foe["maxHp"], COLORS.red)
	var skills := PackedStringArray()
	for skill in battle["skills"]:
		var cooldown := int(skill["cooldown"])
		skills.append(skill["name"] + (" · %d 轮" % cooldown if cooldown > 0 else " · 可用"))
	if not skills.is_empty():
		add_label(" / ".join(skills), 14, COLORS.muted)
	if battle["text"]:
		add_label(battle["text"], 15, COLORS.muted)
	if battle["trip"] is Dictionary:
		draw_trip_progress(battle["trip"])


func draw_trip_progress(trip: Dictionary) -> void:
	add_gauge("已走过", trip["done"], trip["total"], COLORS.gold)
	add_label(trip["text"], 15, COLORS.muted)


func playback_speed_for(notice: Dictionary) -> int:
	return battle_speed if notice.get("settingsOpen", false) else 1


func add_speed_button(parent: Container = null) -> void:
	add_button("速度 ×%d" % battle_speed, cycle_battle_speed, battle_speed == 2, false, parent)


func cycle_battle_speed() -> void:
	battle_speed = 1 if battle_speed == 2 else 2
	save_presentation_setting("battle_speed", battle_speed)


func save_presentation_setting(key: String, value: Variant) -> void:
	var config := ConfigFile.new()
	config.load(AUDIO.SETTINGS)
	config.set_value("presentation", key, value)
	error_text = "" if config.save(AUDIO.SETTINGS) == OK else "无法保存设置。"
	schedule_draw()


func add_battle_scene(data: Dictionary) -> void:
	var backdrop := BATTLE_SCENE.new()
	backdrop.combat = data
	backdrop.playback_speed = playback_speed_for(data)
	page.add_child(backdrop)


func draw_realm(realm: Dictionary, effect: Dictionary = {}) -> void:
	add_label(realm["title"], 24, COLORS.gold)
	add_label(realm["text"], 16)
	add_gauge("气血", realm["hp"], realm["maxHp"], COLORS.jade)
	var scene := REALM_SCENE.new()
	scene.realm = realm
	scene.effect = effect
	scene.door_pressed.connect(func(index: int):
		game_audio.effect("tap")
		request({"op": "realm-action", "move": "door", "index": index})
	)
	scene.effect_finished.connect(func():
		realm_transition.clear()
		schedule_draw()
	)
	page.add_child(scene)
	if not effect.is_empty():
		return
	if realm["phase"] == "shop":
		add_label("秘境行商 · 本局灵石 " + realm["stones"], 19, COLORS.gold)
	elif realm["phase"] == "chest":
		add_label("秘藏 · 选一样带走", 19, COLORS.gold)
	for option in realm["options"]:
		if option["move"] == "door":
			continue
		var message := {"op": "realm-action", "move": option["move"], "index": option["index"]}
		add_button(option["label"], func(): request(message), true, not String(option["why"]).is_empty())
		if option.get("detail"):
			add_label(option["detail"], 14)
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
	if int(guide_hint().get("step", -1)) in [0, 1, 2]:
		request({"op": "guide-nav", "region": null if show_maps else -1})
		return
	show_maps = not show_maps
	selected_map = -1
	show_drops = false
	schedule_draw()


func select_map(index: int) -> void:
	if index in [-1, 0] and int(guide_hint().get("step", -1)) in [1, 2]:
		request({"op": "guide-nav", "region": index})
		return
	selected_map = index
	schedule_draw()


func close_drops() -> void:
	show_drops = false
	schedule_draw()


func guide_hint() -> Dictionary:
	var hint = view.get("guide")
	return hint if hint is Dictionary else {}


func add_guide_button(text: String, callback: Callable, disabled := false) -> void:
	var hint := HBoxContainer.new()
	hint.add_theme_constant_override("separation", 8)
	page.add_child(hint)
	var elder := TextureRect.new()
	elder.texture = STORY_STAGE.portrait_texture("elder|n|")
	elder.custom_minimum_size = Vector2(36, 36)
	elder.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	elder.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	hint.add_child(elder)
	add_label(String(guide_hint()["text"]), 16, COLORS.gold, hint)
	add_button(text, callback, true, disabled)


func start_trip(id: String, args: Array) -> void:
	show_maps = false
	selected_map = -1
	request({"op": "act", "action": id, "args": args})


func action(id: String) -> void:
	request({"op": "act", "action": id})


func next_season() -> void:
	var message := {"op": "season"}
	var left := int(view.get("ap", 0))
	if confirm_idle_ap and left > 0:
		confirm_action("过一季", "剩 %d 点自动打坐，修为 +%s。" % [left, view["idleApXp"]], "过季", message)
	else:
		request(message)


func toggle_saves() -> void:
	show_saves = not show_saves
	save_page = ""
	clipboard_notice = ""
	schedule_draw()


func toggle_settings() -> void:
	show_settings = not show_settings
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


func add_label(text: String, font_size: int, tint: Color = COLORS.text, parent: Container = null) -> void:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_color_override("font_color", tint)
	label.add_theme_font_size_override("font_size", font_size)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	(parent if parent else page).add_child(label)


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
