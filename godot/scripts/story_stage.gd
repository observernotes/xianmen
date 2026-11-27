extends Control

const CAST_PATH := "res://art/story-cast-index.json"
const ART_PATH := "res://art/"

static var cast_index: Dictionary = {}
var background: Texture2D
var left: Texture2D
var right: Texture2D
var line: Dictionary = {}


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	custom_minimum_size.y = 224
	clip_contents = true
	if not line.get("black", false):
		background = scene_texture(String(line.get("scene", "")))
		left = portrait_texture(String(line.get("left", "")))
		right = portrait_texture(String(line.get("right", "")))
	resized.connect(queue_redraw)


static func scene_texture(scene: String) -> Texture2D:
	if scene.is_empty():
		return null
	var filename := scene
	if scene.begins_with("cg:") or scene.begins_with("end:"):
		filename = scene.replace(":", "-").replace("#", "")
	elif scene != "chapter":
		filename = "story-" + scene
	var path := ART_PATH + filename + ".png"
	return load(path) as Texture2D if ResourceLoader.exists(path) else null


static func portrait_texture(key: String) -> AtlasTexture:
	if key.is_empty():
		return null
	if cast_index.is_empty():
		var decoded = JSON.parse_string(FileAccess.get_file_as_string(CAST_PATH))
		if decoded is Dictionary:
			cast_index = decoded
	var parts := key.split("|", true, 2)
	if parts.size() != 3:
		return null
	var base := parts[0].trim_suffix("-alt")
	var entry = cast_index.get(key, cast_index.get(parts[0] + "|" + parts[1] + "|",
		cast_index.get(base + "|" + parts[1] + "|" + parts[2],
			cast_index.get(base + "|" + parts[1] + "|", cast_index.get(base + "|n|")))))
	if not entry is Array:
		return null
	var texture := AtlasTexture.new()
	texture.atlas = load(ART_PATH + "story-cast-%d.png" % int(entry[0]))
	texture.region = Rect2(float(entry[1]), float(entry[2]), float(entry[3]), float(entry[4]))
	texture.filter_clip = true
	return texture


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("#0b0910"))
	if background:
		var scale_factor := maxf(size.x / background.get_width(), size.y / background.get_height())
		var dimensions := background.get_size() * scale_factor
		draw_texture_rect(background, Rect2((size - dimensions) * 0.5, dimensions), false)
	if left or right:
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.04, 0.02, 0.09, 0.2))
	draw_portrait(left, false, line.get("side", "") != "right")
	draw_portrait(right, true, line.get("side", "") != "left")


func draw_portrait(portrait: Texture2D, on_right: bool, speaking: bool) -> void:
	if not portrait:
		return
	var factor := minf(size.x / 234.0, size.y / 138.0)
	var dimensions := portrait.get_size() * factor
	var center := size.x * (0.72 if on_right else 0.28)
	var tint := Color.WHITE if speaking else Color(0.65, 0.61, 0.74)
	draw_texture_rect(portrait, Rect2(center - dimensions.x * 0.5, size.y - dimensions.y, dimensions.x, dimensions.y), false, tint)
