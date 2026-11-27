extends Control

const LANDSCAPES := preload("res://art/combat-landscapes.png")
const ACTORS := preload("res://art/combat-actors.png")
const FONT := preload("res://art/fusion-pixel.ttf")
const ATLAS_PATH := "res://art/combat-index.json"
const ELEMENTS := {
	"jin": Color("#fff194"), "mu": Color("#a9f28a"), "shui": Color("#8ee6ff"),
	"huo": Color("#ff835d"), "tu": Color("#e9ae71"),
}
const LOGICAL_SIZE := Vector2(200, 144)
const PLAYER_X := 50.0
const FEET := 128.0

static var atlas: Dictionary = {}
var combat: Dictionary = {}
var playback_speed := 1
var elapsed := 0.0


func _ready() -> void:
	load_atlas()
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	custom_minimum_size.y = 242
	clip_contents = true


static func load_atlas() -> void:
	if atlas.is_empty():
		var data = JSON.parse_string(FileAccess.get_file_as_string(ATLAS_PATH))
		if data is Dictionary:
			atlas = data


static func actor_frame(index: int) -> Rect2:
	return Rect2((index % 8) * 96, (index >> 3) * 48, 96, 48)


static func hero_frame(hero: int, pose: int) -> Rect2:
	return actor_frame(int(atlas["heroes"][hero][pose]))


func _process(delta: float) -> void:
	elapsed += minf(delta, 0.1) * playback_speed
	queue_redraw()


func _draw() -> void:
	var factor := minf(size.x / LOGICAL_SIZE.x, size.y / LOGICAL_SIZE.y)
	var origin := (size - LOGICAL_SIZE * factor) * 0.5
	draw_set_transform(origin, 0.0, Vector2.ONE * factor)
	draw_texture_rect_region(LANDSCAPES, Rect2(Vector2.ZERO, LOGICAL_SIZE),
		Rect2(0, int(combat.get("region", 0)) * int(LOGICAL_SIZE.y), LOGICAL_SIZE.x, LOGICAL_SIZE.y))
	if atlas.is_empty():
		return
	var foes: Array = combat.get("foes", [])
	var effects: Array = combat.get("effects", [])
	var idle := int(elapsed / 0.45) % 2
	var animation := clampf(elapsed / 0.50, 0.0, 1.0)
	var attacking := animation < 1.0 and effects.any(func(effect): return int(effect["target"]) >= 0)
	var walking: bool = combat.get("kind") == "travel"
	var pose := 2 if attacking else idle
	var hero_x := PLAYER_X + (20.0 * sin(animation * PI) if attacking else 2.0 * sin(elapsed * 5.0) if walking else 0.0)
	draw_texture_rect_region(ACTORS, Rect2(hero_x - 48.0, FEET - 46.0, 96.0, 48.0),
		hero_frame(int(combat.get("hero", 0)), pose))
	var slots := {}
	for i in foes.size():
		var foe: Dictionary = foes[i]
		var x := 123.0 + 27.0 * i - 8.0 * (foes.size() - 1)
		slots[int(foe["index"])] = x
		if foe["hp"] <= 0 and animation >= 1.0:
			continue
		var sources: Array = atlas["foes"].get(foe["id"], atlas["foes"]["yelang"])
		var tint := Color.WHITE
		if foe["hp"] <= 0:
			tint.a = 1.0 - animation
		elif foe["charge"] and idle == 1:
			tint = Color("#ff9e90")
		stamp(int(sources[idle]), x, tint)
	if animation < 1.0:
		for effect in effects:
			draw_impact(effect, slots, animation)


func stamp(index: int, x: float, tint := Color.WHITE) -> void:
	draw_texture_rect_region(ACTORS, Rect2(x - 48.0, FEET - 46.0, 96.0, 48.0), actor_frame(index), tint)


func draw_impact(effect: Dictionary, slots: Dictionary, phase: float) -> void:
	var target := int(effect["target"])
	var x := float(slots.get(target, 130.0)) if target >= 0 else PLAYER_X
	var tint := Color("#ff9e90") if target < 0 else Color(ELEMENTS.get(effect["el"], Color("#ffe3a2")))
	tint.a = 1.0 - phase
	var y := FEET - 25.0
	if target >= 0:
		var radius := 8.0 + phase * (30.0 if effect["kind"] == "ult" else 18.0)
		draw_arc(Vector2(x, y), radius, -1.08, 1.3, 16, tint, 3.0 if effect["kind"] == "ult" else 2.0)
	var amount := ("−" if target < 0 else "") + String(effect["amount"])
	draw_string(FONT, Vector2(x - 10.0, y - 8.0 - phase * 22.0), amount, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, tint)
