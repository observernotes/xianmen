extends SceneTree

var runtime: Object


func _initialize() -> void:
	runtime = ClassDB.instantiate("XianmenRuntime")
	assert(runtime != null)
	assert(runtime.load_program(FileAccess.get_file_as_string("res://data/rules.js")), runtime.get_last_error())
	var start := send({"op": "new", "name": "原生测试"})
	assert(start["view"]["notice"]["title"] == "破庙第一夜")
	assert(start["view"]["notice"]["dialogue"].size() > 0)
	send({"op": "pick", "index": start["view"]["notice"]["options"][0]["index"]})
	send({"op": "advance"})
	var trip := send({"op": "act", "action": "exp", "args": [0, 0, 0]})
	assert(trip["view"]["ap"] == 1)
	assert(trip["view"]["notice"]["kind"] == "travel")
	var saved_trip := send({"op": "load", "save": JSON.stringify(trip["save"])})
	assert(saved_trip["view"]["notice"]["kind"] == "travel")
	var result := saved_trip
	var checked_battle := false
	for i in range(18):
		if result["view"]["notice"]["kind"] == "battle":
			for foe in result["view"]["notice"]["foes"]:
				assert(foe["hp"] <= foe["maxHp"])
			if not checked_battle:
				result = send({"op": "combat", "move": "next"})
				var progress: Dictionary = result["view"]["notice"]
				result = send({"op": "load", "save": JSON.stringify(result["save"])})
				assert(result["view"]["notice"]["kind"] == progress["kind"])
				assert(result["view"]["notice"].get("hp") == progress.get("hp"))
				assert(result["view"]["notice"].get("rage") == progress.get("rage"))
				checked_battle = true
			if result["view"]["notice"]["kind"] == "battle":
				result = send({"op": "advance"}) if result["view"]["notice"]["done"] else send({"op": "combat", "move": "smart"})
		else:
			result = send({"op": "advance"})
		if result["view"]["notice"]["title"] == "历练归来":
			break
	assert(checked_battle)
	assert(result["view"]["notice"]["title"] == "历练归来")
	assert(result["view"]["notice"]["cards"].size() > 0)
	result = send({"op": "result", "move": "reveal", "index": 0})
	var reloaded := send({"op": "load", "save": JSON.stringify(result["save"])})
	assert(reloaded["view"]["notice"]["title"] == "历练归来")
	assert(reloaded["view"]["notice"]["cards"][0]["revealed"])
	while reloaded["view"]["notice"] != null:
		reloaded = send({"op": "advance"})
	var season := send({"op": "season"})
	assert(season["view"]["date"] == "第 1 年 · 夏")
	assert(season["view"]["ap"] == 3)
	var code: String = send({"op": "export"})["result"]
	assert(code.begins_with("XT1."))
	var restored := send({"op": "import", "code": code})
	assert(restored["view"]["name"] == "原生测试")
	assert(restored["view"]["date"] == "第 1 年 · 夏")
	var broken_save: Dictionary = restored["save"].duplicate(true)
	broken_save["state"]["p"]["r"] = -1
	var rejected = JSON.parse_string(runtime.request(JSON.stringify({"op": "load", "save": broken_save})))
	assert(rejected["ok"] == false)
	assert(send({"op": "view"})["view"] == restored["view"])
	for panel in ["equipment", "arts", "market", "sect"]:
		var opened := send({"op": "panel", "panel": panel})
		assert(opened["view"]["panel"]["id"] == panel)
		assert(opened["view"]["panel"]["entries"].size() > 0)
	var realm_save: Dictionary = restored["save"]["state"]
	realm_save["p"]["r"] = 4
	realm_save["flags"]["maxR"] = 4
	realm_save["pact"] = 1
	realm_save["story"]["beat"]["c1_climax"] = 36
	realm_save["evDone"]["s1_pact_after"] = 1
	realm_save["mj"]["token"] = 1
	realm_save["onb"]["at"]["realm"] = 0
	send({"op": "load", "save": JSON.stringify(realm_save)})
	var entered := send({"op": "act", "action": "realm", "args": [false]})
	assert(entered["view"]["notice"]["kind"] == "realm")
	var resumed := send({"op": "load", "save": JSON.stringify(entered["save"])})
	assert(resumed["view"]["notice"] == entered["view"]["notice"])
	var door: Dictionary = resumed["view"]["notice"]["options"][0]
	send({"op": "realm-action", "move": door["move"], "index": door["index"]})
	realm_save["best"]["0_2"] = 3
	send({"op": "load", "save": JSON.stringify(realm_save)})
	var boss := send({"op": "act", "action": "boss", "args": {"k": 0}})
	assert(boss["view"]["notice"]["kind"] == "battle")
	var resumed_boss := send({"op": "load", "save": JSON.stringify(boss["save"])})
	assert(resumed_boss["view"]["notice"] == boss["view"]["notice"])
	var fled := send({"op": "combat", "move": "flee"})
	assert(fled["view"]["notice"]["done"])
	assert(fled["view"]["ap"] == 3)
	var fled_resumed := send({"op": "load", "save": fled["save"]})
	assert(fled_resumed["view"]["notice"]["outcome"] == "撤退")
	var settled_boss := send({"op": "advance"})
	assert(settled_boss["view"]["ap"] == 2)
	assert(settled_boss["view"]["notice"]["title"] == "首领战")

	var late_save: Dictionary = realm_save.duplicate(true)
	late_save["p"].merge({"r": 1, "s": 3, "xp": 1e9}, true)
	late_save["pills"] = 4
	late_save["flags"]["sureBt"] = 1
	var ready := settle_cards(send({"op": "load", "save": late_save}))
	assert(ready["view"]["canBreak"])
	var prepared := send({"op": "break"})
	assert(prepared["view"]["notice"]["kind"] == "breakthrough")
	var started := send({"op": "breakthrough", "move": "confirm"})
	assert(started["view"]["notice"]["active"])
	var resumed_trib := send({"op": "load", "save": started["save"]})
	assert(resumed_trib["view"]["notice"] == started["view"]["notice"])
	assert(resumed_trib["save"]["state"]["trib"]["cur"] == started["save"]["state"]["trib"]["cur"])
	var finished := send({"op": "breakthrough", "move": "confirm"})
	assert(finished["save"]["state"]["p"]["r"] == 2)
	assert(finished["save"]["state"]["pills"] == 4)

	late_save["p"].merge({"r": 0, "s": 0, "xp": 0, "age": 100000}, true)
	var death := settle_cards(send({"op": "load", "save": late_save}))
	assert(death["view"]["notice"]["title"] == "坐化")
	var hall := send({"op": "life", "move": "settle"})
	assert(hall["view"]["notice"]["kind"] == "rebirth")
	var resumed_hall := send({"op": "load", "save": hall["save"]})
	assert(resumed_hall["view"]["notice"] == hall["view"]["notice"])
	var next_life := send({"op": "life", "move": "begin"})
	assert(next_life["save"]["state"]["rebirth"] == 1)
	assert(next_life["save"]["state"]["meta"]["lifeN"] == 1)
	assert(next_life["save"]["state"]["p"]["r"] == 0)

	late_save["p"].merge({"r": 9, "age": 100}, true)
	late_save["eflags"]["elder_kept"] = 1
	var ending := settle_cards(send({"op": "load", "save": late_save}), {"s9_gate": 1})
	assert(ending["view"]["notice"]["mode"] == "ascend")
	assert(ending["save"]["state"]["eflags"]["asc_stay"])
	var stayed := send({"op": "life", "move": "return"})
	assert(stayed["view"]["canReturnToGate"])
	var second_gate := send({"op": "life", "move": "gate"})
	assert(second_gate["view"]["notice"]["key"] == "s9_gate_again")
	var second_ending := settle_cards(second_gate, {"s9_gate_again": 0})
	assert(second_ending["view"]["notice"]["mode"] == "ascend")
	assert(second_ending["save"]["state"]["eflags"]["asc_go"])
	assert(not second_ending["save"]["state"]["eflags"].has("asc_stay"))

	var home_save: Dictionary = realm_save.duplicate(true)
	home_save["rebirth"] = 1
	home_save["stones"] = 1000000
	home_save["herbs"] = 100000
	home_save["feed"] = 30
	home_save["pets"] = [{"sp": "p_tu", "lv": 1, "heart": 2, "u": 1}]
	home_save["petOut"] = 0
	home_save["onb"]["at"].merge({"field": 0, "furnace": 0, "zhen": 0, "crops": 0}, true)
	home_save["gear"]["zhentu"]["f_dujie"] = 1
	settle_cards(send({"op": "load", "save": home_save}))
	send({"op": "panel", "panel": "home"})
	var farm := send({"op": "panel-action", "action": "home-upgrade", "args": ["field"]})
	assert(farm["save"]["state"]["home"]["field"] == 1)
	send({"op": "panel-action", "action": "home-upgrade", "args": ["furnace"]})
	var fields := send({"op": "panel", "panel": "fields"})
	var crop: Dictionary = fields["view"]["panel"]["entries"][0]["buttons"][0]
	var planted := send({"op": "panel-action", "action": crop["name"], "args": crop["args"]})
	assert(planted["save"]["state"]["crops"]["plots"][0]["c"] == crop["args"][1])
	send({"op": "panel", "panel": "formations"})
	var pending_formation := send({"op": "panel-action", "action": "formation-set", "args": [0, "f_dujie"]})
	assert(pending_formation["save"]["state"]["home"]["zhen"][0]["nx"] == "f_dujie")
	settle_cards(pending_formation)
	send({"op": "panel", "panel": "pets"})
	var fed := send({"op": "panel-action", "action": "pet-feed", "args": [0]})
	assert(fed["save"]["state"]["feed"] < 30)
	send({"op": "panel", "panel": "alchemy"})
	var crafted := send({"op": "panel-action", "action": "alchemy-craft", "args": ["peiyuan"]})
	assert(crafted["save"]["state"]["stats"]["crafts"] == 1)
	assert(crafted["view"]["notice"]["title"].begins_with("炼丹"))
	var market_save: Dictionary = home_save.duplicate(true)
	market_save["market"]["evQ"] = [{"id": "mkt_fake", "until": int(market_save["tick"]) + 3}]
	market_save["visitor"] = {"id": "home_neighbor", "left": 6}
	market_save["onb"]["at"]["auction"] = 0
	market_save["auction"] = {
		"at": market_save["tick"], "until": int(market_save["tick"]) + 6, "bids": 0,
		"items": [{"k": "pills", "n": "破境丹", "price": 300, "res": null, "comp": null}],
	}
	settle_cards(send({"op": "load", "save": market_save}))
	var visit := send({"op": "visitor"})
	assert(visit["view"]["notice"]["key"] == "home_neighbor")
	var again := send({"op": "load", "save": visit["save"]})
	assert(again["view"]["notice"] == visit["view"]["notice"])
	var dismissed := send({"op": "dismiss-event"})
	assert(dismissed["view"]["visitor"] is Dictionary)
	var visit_outcome := settle_cards(send({"op": "visitor"}))
	assert(visit_outcome["save"]["state"]["visitor"] == null)
	var fair := send({"op": "panel", "panel": "auction"})
	assert(fair["view"]["notice"]["key"] == "mkt_fake")
	var auction := send({"op": "dismiss-event"})
	assert(auction["view"]["panel"]["id"] == "auction")
	var lot := send({"op": "panel-action", "action": "auction-bid", "args": [0, 2]})
	assert(lot["save"]["state"]["auction"]["bids"] == 1)
	assert(lot["save"]["state"]["auction"]["items"][0]["res"] != null)
	var auction_resumed := send({"op": "load", "save": lot["save"]})
	assert(auction_resumed["view"]["notice"] == lot["view"]["notice"])
	assert(send({"op": "advance"})["view"]["panel"]["id"] == "auction")

	market_save["visitor"] = {"id": "pp_su_drop", "left": 6}
	market_save["npc"]["su"] = {"aff": 80}
	market_save["onb"]["at"]["comp"] = 0
	market_save["gear"]["w"] = {"id": "w1_0", "u": 1, "plus": 3, "aff": ["huixin"], "edge": []}
	market_save["mats"]["rune"] = 4
	settle_cards(send({"op": "load", "save": market_save}))
	assert(send({"op": "visitor"})["view"]["notice"]["gifts"])
	send({"op": "visitor-gifts"})
	var gift := send({"op": "panel-action", "action": "person-gift", "args": ["su", "herbs"]})
	assert(gift["save"]["state"]["visitor"]["gift"] == 1)
	assert(send({"op": "advance"})["view"]["panel"]["id"] == "people")
	var companion := send({"op": "panel-action", "action": "companion", "args": ["su"]})
	assert(companion["save"]["state"]["ppl"]["comp"] == "su")
	assert(send({"op": "wish", "k": 0, "d": 0, "index": 0})["save"]["state"]["wish"]["i"] == 0)
	send({"op": "panel", "panel": "equipment"})
	var rerolled := send({"op": "panel-action", "action": "gear-reforge", "args": ["w", 0]})
	assert(rerolled["view"]["notice"]["kind"] == "reforge")
	var wash_resumed := send({"op": "load", "save": rerolled["save"]})
	assert(wash_resumed["view"]["notice"] == rerolled["view"]["notice"])
	var equipped := send({"op": "reforge-keep", "replace": true})
	assert(equipped["save"]["state"]["gear"]["w"]["aff"][0] == rerolled["save"]["state"]["gear"]["rf"]["neu"])

	var joined := settle_cards(send({"op": "act", "action": "join", "args": {"id": "jian"}}))
	var sect_save: Dictionary = joined["save"]["state"]
	sect_save["sect"].merge({"rank": 2, "pts": 100000, "total": 100000}, true)
	sect_save["onb"]["at"].merge({"vault": 0, "disc": 0, "duty": 0, "codex": 0, "cal": 0}, true)
	sect_save["disc"]["cand"] = [{"n": "试剑", "cat": "strong", "tp": "qin", "t": 2, "f": 0, "seed": 16}]
	settle_cards(send({"op": "load", "save": sect_save}))
	assert(send({"op": "panel", "panel": "sectVault"})["view"]["panel"]["entries"].size() > 1)
	assert(send({"op": "panel", "panel": "sectElders"})["view"]["panel"]["entries"].size() > 3)
	send({"op": "panel", "panel": "disciples"})
	var disciple := settle_cards(send({"op": "panel-action", "action": "disciple-take", "args": [0]}))
	assert(disciple["save"]["state"]["disc"]["list"][0]["n"] == "试剑")
	var job := send({"op": "panel-action", "action": "disciple-job", "args": [1, "cult"]})
	assert(job["save"]["state"]["disc"]["list"][0]["job"] == "cult")
	assert(send({"op": "panel", "panel": "calendar"})["view"]["panel"]["entries"].size() > 3)
	assert(send({"op": "panel", "panel": "journal"})["view"]["panel"]["entries"].size() > 1)
	assert(send({"op": "panel", "panel": "codex:gear"})["view"]["panel"]["entries"].size() > 1)
	print("Godot native runtime: story, combat, seasons, management, realm, tribulation, rebirth, events, followers, gear and save roundtrips passed")
	quit()


func settle_cards(response: Dictionary, picks := {}) -> Dictionary:
	for i in range(30):
		var notice = response["view"]["notice"]
		if notice == null:
			break
		if notice["kind"] == "choice":
			var available: Array = notice["options"].filter(func(option): return option["available"])
			assert(not available.is_empty())
			response = send({"op": "pick", "index": picks.get(notice["key"], available[0]["index"])})
		elif notice["kind"] == "card":
			response = send({"op": "advance"})
		else:
			break
	return response


func send(message: Dictionary) -> Dictionary:
	var response = JSON.parse_string(runtime.request(JSON.stringify(message, "", false, true)))
	assert(response is Dictionary, runtime.get_last_error())
	assert(response["ok"], response.get("error", "Unknown runtime error"))
	return response
