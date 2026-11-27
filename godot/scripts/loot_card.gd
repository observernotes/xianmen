extends Button

signal reveal_all

const ART := preload("res://art/loot-art.png")
const INDEX_PATH := "res://art/loot-index.json"
const FRAME := Vector2(26, 34)
const FLIP_TIME := 0.26
const GOLD_GLOW := Color("#ffd690")
const RARE_GLOW := Color("#b692ff")

static var icons: Dictionary = {}
var card: Dictionary
var flip_delay := -1.0
var elapsed := 0.0
var shimmer := 0
var held_at := -1.0


func _ready() -> void:
	if icons.is_empty():
		var data = JSON.parse_string(FileAccess.get_file_as_string(INDEX_PATH))
		if data is Dictionary:
			icons = data
	custom_minimum_size = FRAME * 2
	mouse_filter = Control.MOUSE_FILTER_PASS
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	flat = true
	disabled = card["revealed"]
	accessibility_name = String(card.get("name", "翻牌 %d" % (int(card["index"]) + 1)))
	var focus_frame := StyleBoxFlat.new()
	focus_frame.draw_center = false
	focus_frame.set_border_width_all(1)
	focus_frame.border_color = GOLD_GLOW
	add_theme_stylebox_override("focus", focus_frame)
	set_process(flip_delay >= 0.0 or card.get("shiny", false))
	resized.connect(queue_redraw)
	button_down.connect(begin_hold)
	button_up.connect(cancel_hold)
	mouse_exited.connect(cancel_hold)


func begin_hold() -> void:
	held_at = elapsed
	set_process(true)


func cancel_hold() -> void:
	held_at = -1.0
	if not card["revealed"] and not card.get("shiny", false):
		set_process(false)


func _notification(what: int) -> void:
	if held_at >= 0.0 and what in [NOTIFICATION_SCROLL_BEGIN, NOTIFICATION_APPLICATION_PAUSED]:
		cancel_hold()


func _process(delta: float) -> void:
	elapsed += minf(delta, 0.1)
	if not card["revealed"]:
		if held_at >= 0.0 and elapsed - held_at >= 0.50:
			cancel_hold()
			reveal_all.emit()
			return
		var next_shimmer := int(elapsed * 4.0) % 2
		if next_shimmer != shimmer:
			shimmer = next_shimmer
			queue_redraw()
		return
	queue_redraw()
	if elapsed >= flip_delay + FLIP_TIME + 0.42:
		set_process(false)


func _draw() -> void:
	var stars := clampi(int(card.get("stars", 0)), 0, 3)
	var since_flip := elapsed - flip_delay
	var phase := clampf(since_flip / FLIP_TIME, 0.0, 1.0) if flip_delay >= 0.0 else 1.0
	var face_up: bool = card["revealed"] and phase >= 0.5
	var squish := maxf(0.04, absf(cos(phase * PI)))
	var center := size * 0.5
	if face_up and stars >= 2 and flip_delay >= 0.0:
		var glow := GOLD_GLOW if stars == 3 else RARE_GLOW
		glow.a = 0.65 * (1.0 - clampf((since_flip - FLIP_TIME * 0.5) / 0.55, 0.0, 1.0))
		draw_circle(center, 36.0 + phase * 4.0, glow)
	draw_set_transform(center, 0.0, Vector2(2.0 * squish, 2.0))
	var corner := -FRAME * 0.5
	var frame := clampi(int(card.get("tier", 1)), 1, 7) + 1 if face_up else shimmer
	draw_texture_rect_region(ART, Rect2(corner, FRAME), Rect2(Vector2(frame * FRAME.x, 0), FRAME))
	if not face_up or icons.is_empty():
		return
	draw_icon(String(card.get("icon", "stone")), corner + Vector2(5, 5), 16)
	for i in stars:
		if flip_delay < 0.0 or stars < 3 or since_flip >= FLIP_TIME * 0.5 + i * 0.13:
			draw_icon("star", corner + Vector2(3 + i * 7, 25), 7)


func draw_icon(id: String, position: Vector2, width: int) -> void:
	var source: Array = icons.get(id, icons["stone"])
	var extent := Vector2.ONE * width
	draw_texture_rect_region(ART, Rect2(position, extent), Rect2(Vector2(source[0], source[1]), extent))
