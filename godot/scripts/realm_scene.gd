extends Control

signal door_pressed(index: int)
signal effect_finished

const ACTORS := preload("res://scripts/battle_scene.gd")
const STAGES := preload("res://art/realm-stages.png")
const DOORS := preload("res://art/realm-doors.png")
const EFFECTS := preload("res://art/realm-effects.png")
const FONT := preload("res://art/fusion-pixel.ttf")
const THEMES := ["jin", "mu", "huo", "shui"]
const ROOM_ART := ["fight", "elite", "chest", "spring", "event", "insight", "shop", "boss", "unk", "trap"]
const ROOM_NAMES := ["战", "精英", "宝", "泉", "奇", "悟", "商", "守关", "？"]
const DOOR_CENTERS := [[138.0], [112.0, 162.0], [96.0, 136.0, 176.0]]
const STAGE_SIZE := Vector2(200.0, 160.0)
const EFFECT_DURATION := 0.52

var realm: Dictionary
var effect: Dictionary = {}
var choices: Array = []
var targets: Array[Button] = []
var elapsed := 0.0


func _ready() -> void:
	ACTORS.load_atlas()
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size.y = 278
	choices = realm["options"].filter(func(option): return option["move"] == "door")
	if effect.is_empty():
		for option in choices:
			var target := Button.new()
			target.flat = true
			target.mouse_filter = Control.MOUSE_FILTER_PASS
			target.accessibility_name = String(option["label"]) + " " + String(option["hint"])
			var index := int(option["index"])
			target.pressed.connect(func(): door_pressed.emit(index))
			add_child(target)
			targets.append(target)
	resized.connect(position_doors)
	position_doors()


func _process(delta: float) -> void:
	elapsed += delta
	if not effect.is_empty() and elapsed >= EFFECT_DURATION:
		set_process(false)
		effect_finished.emit()
		return
	queue_redraw()


func stage_scale() -> float:
	return minf(size.x / STAGE_SIZE.x, size.y / STAGE_SIZE.y)


func stage_origin(factor: float) -> Vector2:
	return (size - STAGE_SIZE * factor) * 0.5


func door_x(index: int) -> float:
	if choices.size() > DOOR_CENTERS.size():
		return lerpf(30.0, 170.0, float(index) / (choices.size() - 1))
	return DOOR_CENTERS[clampi(choices.size() - 1, 0, 2)][index]


func position_doors() -> void:
	var factor := stage_scale()
	var origin := stage_origin(factor)
	for i in targets.size():
		targets[i].position = origin + Vector2(door_x(i) - 19.0, 86.0) * factor
		targets[i].size = Vector2(38.0, 63.0) * factor


func _draw() -> void:
	var factor := stage_scale()
	draw_set_transform(stage_origin(factor), 0.0, Vector2.ONE * factor)
	var theme := maxi(0, THEMES.find(realm.get("theme", "")))
	var frame := int(elapsed / 0.14) % 12
	draw_texture_rect_region(STAGES, Rect2(Vector2.ZERO, STAGE_SIZE),
		Rect2(frame * STAGE_SIZE.x, theme * STAGE_SIZE.y, STAGE_SIZE.x, STAGE_SIZE.y))
	var phase := clampf(elapsed / EFFECT_DURATION, 0.0, 1.0)
	var active := not effect.is_empty()
	var kind := String(effect.get("art", ""))
	var combat := kind in ["fight", "elite", "boss"]
	var pose := 2 if combat and phase < 0.65 else int(elapsed / 0.45) % 2
	var x := 44.0 + (24.0 * sin(phase * PI) if combat else 0.0)
	if not ACTORS.atlas.is_empty():
		var fade := 1.0 - phase * 0.8 if effect.get("wipe") else 1.0
		draw_texture_rect_region(ACTORS.ACTORS, Rect2(x - 48.0, 82.0, 96.0, 48.0),
			ACTORS.hero_frame(int(realm["hero"]), pose), Color(1.0, 1.0, 1.0, fade))
	for i in choices.size():
		draw_door(i, phase, active)
	if active:
		var effect_index := ROOM_ART.find(kind)
		if effect_index >= 0:
			var effect_x := 74.0 if combat else door_x(int(effect["index"]))
			draw_texture_rect_region(EFFECTS, Rect2(effect_x - 32.0, 86.0, 64.0, 56.0),
				Rect2(mini(7, int(phase * 8.0)) * 64, effect_index * 56, 64, 56))
		var hp_change := int(effect["hp"]) - int(realm["hp"])
		if hp_change != 0 and phase > 0.16:
			var tint := Color("#ffaca2") if hp_change < 0 else Color("#bcffda")
			draw_string(FONT, Vector2(x - 20.0, 90.0 - phase * 22.0), "%+d" % hp_change,
				HORIZONTAL_ALIGNMENT_CENTER, 40, 14, tint)


func draw_door(i: int, phase: float, active: bool) -> void:
	var option: Dictionary = choices[i]
	var art := clampi(ROOM_ART.find(option["art"]), 0, ROOM_NAMES.size() - 1)
	var x := door_x(i)
	var bounds := Rect2(x - 16.0, 88.0, 32.0, 40.0)
	var selected := active and int(effect["index"]) == i
	var fade := maxf(0.0, 1.0 - phase * 1.6) if selected else 1.0
	if option["recommended"] and not active:
		draw_rect(bounds.grow(1.0), Color("#ffd990"), false, 1.0)
	draw_texture_rect_region(DOORS, bounds, Rect2(art * 32, 0, 32, 40), Color(1.0, 1.0, 1.0, fade))
	if not active:
		var caption := String(ROOM_NAMES[art]) + (" " + String(option["hint"]) if option["hint"] else "")
		draw_rect(Rect2(x - 19.0, 130.0, 38.0, 13.0), Color("#161223"))
		var tint := Color("#ff9c91") if option["danger"] else Color("#ffd990") if option["recommended"] else Color("#efe4cf")
		draw_string(FONT, Vector2(x - 19.0, 140.0), caption, HORIZONTAL_ALIGNMENT_CENTER, 38, 10, tint)
