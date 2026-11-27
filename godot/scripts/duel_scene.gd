extends Control

signal sound_cue(key: String)
signal completed

const STAGES := preload("res://art/duel-stages.png")
const ACTORS := preload("res://art/duel-actors.png")
const FONT := preload("res://art/fusion-pixel.ttf")
const PORTRAITS := preload("res://scripts/story_stage.gd")
const LOGICAL_SIZE := Vector2(200, 144)
const FEET := 128.0
const FACE_TIME := 1.15
const ENTRY_TIME := 0.42
const SEAL_TIME := 0.55
const ELEMENTS := {
	"jin": Color("#fff194"), "mu": Color("#a9f28a"), "shui": Color("#8ee6ff"),
	"huo": Color("#ff835d"), "tu": Color("#e9ae71"),
}

static var atlas: Dictionary = {}
var bout: Dictionary
var elapsed := 0.0
var face_time := 0.0
var hit_time := 0.52
var plan: Array = []
var impact := -1
var sealed := false
var paused := false
var faces: Array[Texture2D] = []
var arena_origin: Vector2
var arena_scale := 1.0


func _ready() -> void:
	if atlas.is_empty():
		var index = JSON.parse_string(FileAccess.get_file_as_string("res://art/duel-index.json"))
		if index is Dictionary:
			atlas = index
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	clip_contents = true
	custom_minimum_size.y = 260
	faces = [
		PORTRAITS.portrait_texture(bout["left"].get("face", "")),
		PORTRAITS.portrait_texture(bout["right"].get("face", "")),
	]
	if faces[0] and faces[1]:
		face_time = FACE_TIME
	if bout.get("short", false):
		hit_time = 0.4
	make_plan()
	sound_cue.emit("gong")


func make_plan() -> void:
	var win: bool = bout["win"]
	var p := clampf(bout.get("chance", 0.5), 0.03, 0.97)
	# Each entry gives the attacker and the target's remaining HP.
	if bout.get("short", false):
		plan = [[1, 0.45], [0, 0.0]] if win else [[0, 0.45], [1, 0.0]]
	elif win and p < 0.45:
		plan = [[0, 0.82], [1, 0.38], [1, 0.07], [-1, 0.0], [0, 0.0]]
	elif win:
		plan = [[0, 0.72 - 0.2 * p], [1, 0.55 + 0.35 * p], [0, 0.34 - 0.18 * p], [0, 0.0]]
	elif p > 0.6:
		plan = [[0, 0.55], [1, 0.58], [0, 0.14], [1, 0.0]]
	else:
		plan = [[1, 0.5 + 0.3 * p], [0, 0.82 - 0.2 * p], [1, 0.24], [1, 0.0]]


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED:
		paused = true
	elif what == NOTIFICATION_APPLICATION_RESUMED:
		paused = false


func _process(delta: float) -> void:
	if paused or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		return
	elapsed += minf(delta, 0.1)
	var exchange := (elapsed - face_time - ENTRY_TIME) / hit_time
	var next_impact := mini(int(floor(exchange - 0.45)), plan.size() - 1)
	if next_impact > impact:
		impact = next_impact
		var hit: Array = plan[impact]
		sound_cue.emit("bell" if hit[0] == -1 else "heavy" if hit[1] == 0.0 else "hit")
	if exchange >= plan.size() and not sealed:
		sealed = true
		sound_cue.emit("victory" if bout["win"] else "defeat")
	if exchange >= plan.size() + SEAL_TIME / hit_time:
		set_process(false)
		completed.emit()
	queue_redraw()


func _draw() -> void:
	if atlas.is_empty() or plan.is_empty():
		return
	arena_scale = minf(size.x / LOGICAL_SIZE.x, size.y / LOGICAL_SIZE.y)
	arena_origin = (size - LOGICAL_SIZE * arena_scale) * 0.5
	draw_set_transform(arena_origin, 0.0, Vector2.ONE * arena_scale)
	var stage: int = atlas["stages"].find(bout.get("stage", "wild"))
	draw_texture_rect_region(STAGES, Rect2(Vector2.ZERO, LOGICAL_SIZE),
		Rect2(maxi(0, stage) * LOGICAL_SIZE.x, 0, LOGICAL_SIZE.x, LOGICAL_SIZE.y))
	if elapsed < face_time:
		draw_faceoff()
		return
	var entry := clampf((elapsed - face_time) / ENTRY_TIME, 0.0, 1.0)
	var exchange := maxf(0.0, (elapsed - face_time - ENTRY_TIME) / hit_time)
	var step := mini(int(exchange), plan.size())
	var phase := fposmod(exchange, 1.0)
	var hp := [1.0, 1.0]
	for index in step:
		var landed: Array = plan[index]
		if landed[0] >= 0:
			hp[1 - landed[0]] = landed[1]
	var action: Array = plan[step] if step < plan.size() and entry >= 1.0 else []
	var striker := int(action[0]) if not action.is_empty() else -1
	if striker >= 0 and phase > 0.45:
		hp[1 - striker] = lerpf(hp[1 - striker], action[1], clampf((phase - 0.45) * 4.0, 0.0, 1.0))

	var x := [68.0, 132.0]
	var idle := int(elapsed / 0.42) % 2
	var poses := [idle, idle]
	for side in 2:
		var direction := 1.0 if side == 0 else -1.0
		x[side] -= direction * 100.0 * pow(1.0 - entry, 2.0)
		if hp[side] <= 0.0:
			poses[side] = 5
		elif striker == side:
			poses[side] = 2 if phase < 0.3 else 3
			x[side] += direction * (36.0 * sin(PI * phase) if phase >= 0.3 else -3.0 * phase)
		elif striker == 1 - side and phase >= 0.45:
			poses[side] = 4
			x[side] -= direction * 5.0 * sin(PI * (phase - 0.45) / 0.55)
	if bout["right"]["actor"] == "war":
		stamp("war", idle, x[1] + 21.0, true, Color("#b7b5d0"), -4.0)
		stamp("war", idle, x[1] + 40.0, true, Color("#9997b2"), -6.0)
	stamp(bout["left"]["actor"], poses[0], x[0], false)
	stamp(bout["right"]["actor"], poses[1], x[1], true)
	draw_set_transform(arena_origin, 0.0, Vector2.ONE * arena_scale)
	for side in 2:
		var bar := Rect2(x[side] - 19.0, 81.0, 38.0, 4.0)
		draw_rect(bar.grow(1.0), Color("#151028"))
		draw_rect(Rect2(bar.position, Vector2(bar.size.x * hp[side], bar.size.y)),
			Color("#a3e7c7") if side == 0 else Color("#ff9c91"))
	if striker >= 0 and phase >= 0.3 and phase < 0.86:
		draw_strike(striker, x, phase)
	elif not action.is_empty() and striker < 0:
		var flash := Color(1.0, 0.84, 0.45, sin(PI * phase) * 0.65)
		draw_circle(Vector2(68.0, 100.0), 12.0 + phase * 20.0, flash)
		draw_center("戒指发光", 49.0, 14, Color("#ffe39a"))
	if sealed:
		var seal_color := Color("#ffd990") if bout["win"] else Color("#ff9c91")
		draw_rect(Rect2(84, 25, 32, 28), Color("#171125"))
		draw_rect(Rect2(84, 25, 32, 28), seal_color, false)
		draw_center("胜" if bout["win"] else "败", 46.0, 20, seal_color)


func stamp(actor: String, pose: int, x: float, mirrored: bool, tint := Color.WHITE, rise := 0.0) -> void:
	var index := int(atlas["fighters"].get(actor, atlas["fighters"]["guest-0"])) + pose
	draw_set_transform(arena_origin + Vector2(x, 0.0) * arena_scale, 0.0,
		Vector2(-arena_scale if mirrored else arena_scale, arena_scale))
	draw_texture_rect_region(ACTORS, Rect2(-24, FEET - 46 + rise, 48, 48),
		Rect2((index % 16) * 48, (index >> 4) * 48, 48, 48), tint)


func draw_strike(side: int, x: Array, phase: float) -> void:
	var fighter: Dictionary = bout["left"] if side == 0 else bout["right"]
	var tint: Color = ELEMENTS.get(fighter.get("el"), Color("#ffe39a"))
	var target := Vector2(x[1 - side], 105.0)
	var from := Vector2(x[side], 107.0)
	if phase < 0.45:
		var center := from.lerp(target, (phase - 0.3) / 0.15)
		draw_line(center.lerp(from, 0.3), center, tint, 3.0)
	else:
		var hit := (phase - 0.45) / 0.41
		tint.a = 1.0 - hit
		draw_arc(target, 4.0 + hit * 22.0, -1.1, 1.0, 12, tint, 2.0)
		draw_line(target + Vector2(-10, -7), target + Vector2(10, 6), tint, 2.0)


func draw_faceoff() -> void:
	draw_rect(Rect2(0, 38, 200, 70), Color(0.06, 0.04, 0.10, 0.84))
	draw_texture_rect(faces[0], Rect2(18, 42, 64, 64), false)
	draw_texture_rect(faces[1], Rect2(118, 42, 64, 64), false)
	draw_center("对决", 81.0, 12, Color("#ffd990"))


func draw_center(label: String, baseline: float, font_size: int, color: Color) -> void:
	var width := FONT.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
	draw_string(FONT, Vector2((LOGICAL_SIZE.x - width) * 0.5, baseline), label,
		HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, color)
