extends Control

const ACTORS := preload("res://art/cave-actors.png")
const PROPS := preload("res://art/cave-props.png")
const SLOTS := [Vector2(100, 136), Vector2(22, 128), Vector2(166, 133), Vector2(62, 127),
	Vector2(138, 127), Vector2(60, 152), Vector2(142, 153), Vector2(186, 152)]
const PICTURE := Vector2(400, 448)
const SEASON_COLORS := [Color("#ffc0dd"), Color("#e8ffae"), Color("#ffc770"), Color("#f2fbff")]

var data: Dictionary
var backdrop: Texture2D
var props: Dictionary
var portrait: Texture2D
var elapsed := 0.0


func _ready() -> void:
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var level := int(data["caveLevel"])
	var tier := 0 if level <= 0 else 1 if level <= 2 else 2 if level <= 5 else 3 if level <= 8 else 4
	var season := clampi(int(data["season"]), 0, 3)
	backdrop = load("res://art/cave-scene-%d-%d.png" % [season, tier])
	props = JSON.parse_string(FileAccess.get_file_as_string("res://art/cave-props.json"))
	portrait = preload("res://scripts/story_stage.gd").portrait_texture(data["elderPortrait"])


func _process(delta: float) -> void:
	elapsed += minf(delta, 0.1)
	queue_redraw()


func _draw() -> void:
	if backdrop == null or size.x < 1 or size.y < 1:
		return
	var zoom := maxf(size.x / PICTURE.x, size.y / PICTURE.y)
	var origin := Vector2((size.x - PICTURE.x * zoom) / 2.0, size.y - PICTURE.y * zoom)
	draw_set_transform(origin, 0.0, Vector2.ONE * zoom)
	draw_texture(backdrop, Vector2.ZERO)
	for i in data["crops"].size():
		var crop: int = props["crops"].find(data["crops"][i])
		if crop >= 0:
			var position := Vector2(5 + i % 2 * 18, 112 + (i >> 1) * 12)
			var crop_rect := Rect2(position * 2 + Vector2(-32, 76), Vector2(96, 96))
			draw_texture_rect_region(PROPS, crop_rect, Rect2(crop * 48, 48, 48, 48))
	draw_buildings(false)
	var actor := clampi(int(data["hero"]), 0, 19)
	var lift := roundf(sin(elapsed * 2.0) * 3.0) + 3.0 if actor >= 14 else 0.0
	var breath := floorf(sin(elapsed * 2.6) + 1.0)
	var feet := Vector2(200, 400 - lift - breath)
	if int(data["arrayLevel"]) > 0:
		draw_formation(Vector2(200, 398))
	var tint := Color("#aaaabb") if data["injured"] else Color.WHITE
	draw_texture_rect_region(ACTORS, Rect2(feet - Vector2(40, 80), Vector2(80, 80)),
		Rect2((actor % 5) * 80, int(actor / 5.0) * 80, 80, 80), tint)
	draw_buildings(true)
	if portrait != null:
		draw_texture_rect(portrait, Rect2(286, 295 + roundf(sin(elapsed * 1.75) * 4.0), 48, 68),
			false, Color(0.78, 0.9, 1.0, 0.70))
	draw_weather()
	draw_set_transform(Vector2.ZERO)
	draw_rect(Rect2(Vector2.ZERO, size), Color("#47365c"), false, 1.0)


func draw_buildings(foreground: bool) -> void:
	for building in data["blocks"]:
		var slot := int(building.get("slot", -1)) if building.get("slot") != null else -1
		var index: int = props["buildings"].find(building["id"])
		if index < 0 or not slot in range(SLOTS.size()):
			continue
		var position: Vector2 = SLOTS[slot]
		if (position.y > 136) != foreground:
			continue
		var rect := Rect2(position * 2 + Vector2(-48, 40), Vector2(96, 96))
		draw_texture_rect_region(PROPS, rect, Rect2(index * 48, 0, 48, 48))


func draw_formation(center: Vector2) -> void:
	for i in 54:
		var angle := i * TAU / 54
		var point := center + Vector2(cos(angle) * 58, sin(angle) * 14)
		var light := 0.14 + 0.45 * (0.5 + 0.5 * sin(angle * 3.0 - elapsed * 2.6))
		draw_rect(Rect2(point.round(), Vector2(2, 2)), Color(0.54, 0.98, 0.84, light))


func draw_weather() -> void:
	var tint: Color = SEASON_COLORS[clampi(int(data["season"]), 0, 3)]
	for i in 21:
		var x := fposmod(i * 53.0 + elapsed * (5.0 + i % 3), PICTURE.x)
		var y := fposmod(i * 71.0 + elapsed * (9.0 + i % 4), PICTURE.y)
		var bright := 0.2 + 0.52 * (0.5 + 0.5 * sin(i * 2.2 + elapsed * 1.8))
		draw_rect(Rect2(roundf(x), roundf(y), 2, 2), Color(tint, bright))
	for i in 12:
		var y := 228.0 + fposmod(i * 11.0 + elapsed * 51.0, 101.0)
		var x := 28.0 + (i % 3) * 2.0
		draw_rect(Rect2(x, roundf(y), 2.0, 3.0), Color(0.76, 0.93, 1.0, 0.6))
