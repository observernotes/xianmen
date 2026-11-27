extends SceneTree

var runtime: Object


func _initialize() -> void:
	runtime = ClassDB.instantiate("XianmenRuntime")
	assert(runtime != null)
	assert(runtime.load_program(FileAccess.get_file_as_string("res://data/rules.js")), runtime.get_last_error())
	var start := send({"op": "new", "name": "原生测试"})
	assert(start["view"]["notice"]["title"] == "破庙第一夜")
	var opening_film: Dictionary = start["view"]["cinema"]
	assert(opening_film["asset"] == "ring")
	assert(ResourceLoader.exists("res://cinematics/ring.ogv"))
	assert(not request({"op": "cinema-done", "token": "tianmen"})["ok"])
	assert(send({"op": "load", "save": start["save"]})["view"]["cinema"] == opening_film)
	var opening_done := send({"op": "cinema-done", "token": opening_film["token"]})
	assert(opening_done["view"]["cinema"] == null)
	assert(opening_done["view"]["notice"] == start["view"]["notice"])
	assert(opening_done["save"]["state"]["meta"]["cine"]["ring"] == 1)
	var opening: Array = start["view"]["notice"]["dialogue"]
	assert(not opening.is_empty())
	assert(opening[0]["scene"] == "temple")
	assert(opening.any(func(line): return line["right"] == "elder|n|"))
	var story_stage := preload("res://scripts/story_stage.gd")
	assert(story_stage.portrait_texture("elder|n|"))
	assert(story_stage.portrait_texture("me-0|n|"))
	assert(story_stage.scene_texture("cg:jade:1"))
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
	assert(entered["view"]["notice"]["theme"] in ["jin", "mu", "huo", "shui"])
	var resumed := send({"op": "load", "save": JSON.stringify(entered["save"])})
	assert(resumed["view"]["notice"] == entered["view"]["notice"])
	var door: Dictionary = resumed["view"]["notice"]["options"][0]
	assert(door.has("art") and door.has("hint"))
	assert(send({"op": "realm-action", "move": door["move"], "index": door["index"]})["result"]["realmFx"]["index"] == door["index"])
	check_realm_settlement(entered["save"])
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
	assert(ending["view"]["cinema"]["asset"] == "end_dixian-elder")
	var closed := send({"op": "cinema-done", "token": ending["view"]["cinema"]["token"]})
	assert(closed["view"]["cinema"] == null)
	assert(send({"op": "load", "save": closed["save"]})["view"]["cinema"] == null)
	var stayed := send({"op": "life", "move": "return"})
	assert(stayed["view"]["canReturnToGate"])
	var second_gate := send({"op": "life", "move": "gate"})
	assert(second_gate["view"]["notice"]["key"] == "s9_gate_again")
	var second_ending := settle_cards(second_gate, {"s9_gate_again": 0})
	assert(second_ending["view"]["notice"]["mode"] == "ascend")
	assert(story_stage.scene_texture(second_ending["view"]["notice"]["scene"]))
	assert(second_ending["save"]["state"]["eflags"]["asc_go"])
	assert(second_ending["view"]["cinema"]["asset"] == "end_shitu")
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
	var records := send({"op": "panel", "panel": "memories"})
	assert(records["view"]["panel"]["entries"].any(func(entry):
		return entry["buttons"].any(func(button): return button["cine"]["asset"] == "ring")
	))
	assert(send({"op": "panel", "panel": "codex:gear"})["view"]["panel"]["entries"].size() > 1)
	check_duels(restored["save"]["state"])
	print("Godot native runtime: story, combat, seasons, management, realm, tribulation, rebirth, events, followers, gear, duels and save roundtrips passed")
	quit()


func check_realm_settlement(entered: Dictionary) -> void:
	var fixture: Dictionary = entered.duplicate(true)
	fixture["state"]["stones"] = 1000
	var run_data: Dictionary = fixture["state"]["run"]
	run_data["phase"] = "shop"
	run_data["loot"] = [{"stones": 100, "t": "灵石 100"}]
	run_data["shop"] = [{"k": "pill", "n": "破境丹", "price": 20, "d": "破境丹 +1"}]
	var stall := send({"op": "load", "save": fixture})
	assert(stall["view"]["notice"]["stones"] == "100")
	assert(stall["view"]["notice"]["options"][0]["detail"] == "破境丹 +1")
	var bought := send({"op": "realm-action", "move": "shop", "index": 0})
	var next_floor := send({"op": "advance"})
	assert(bought["save"]["state"]["run"]["loot"][0]["stones"] == 80)
	assert(next_floor["view"]["notice"]["phase"] == "door")
	var before: int = fixture["state"]["stones"]
	var exited := send({"op": "realm-action", "move": "leave", "index": -1})
	assert(exited["save"]["state"]["stones"] >= before + 80)
	assert(exited["view"]["notice"]["text"].contains("灵石 +80"))
	assert(send({"op": "load", "save": exited["save"]})["view"]["notice"] == exited["view"]["notice"])

	run_data["phase"] = "chest"
	run_data["floor"] = run_data["floors"]
	run_data["chest"] = [{"k": "stones", "n": "一囊灵石", "v": 50}]
	send({"op": "load", "save": fixture})
	var cleared := send({"op": "realm-action", "move": "chest", "index": 0})
	assert(cleared["save"]["state"]["stones"] >= before + 150)
	assert(cleared["view"]["notice"]["title"].ends_with("通关"))
	assert(cleared["view"]["notice"]["text"].contains("首通称号"))
	assert(cleared["view"]["notice"]["text"].contains("灵石 +50"))

	run_data["phase"] = "door"
	run_data["hp"] = 1
	run_data["doors"] = [{"t": "boss", "unk": false}]
	send({"op": "load", "save": fixture})
	var wiped := send({"op": "realm-action", "move": "door", "index": 0})
	assert(wiped["result"]["realmFx"]["wipe"])
	assert(wiped["save"]["state"]["run"] == null)
	assert(wiped["save"]["state"]["stones"] >= before + 40)
	assert(wiped["view"]["notice"]["text"].contains("灵石 +40"))


func check_duels(base: Dictionary) -> void:
	var ladder: Dictionary = base.duplicate(true)
	ladder["p"].merge({"r": 4, "s": 3}, true)
	ladder["flags"]["maxR"] = 4
	ladder["pact"] = 1
	ladder["quest"]["done"]["c0_m"] = 1
	ladder["story"]["chCard"] = 0
	ladder["rank"] = 87
	ladder["bestRank"] = 87
	ladder["arts"]["own"].merge({"z_liejin": 0, "z_qingteng": 0}, true)
	ladder["arts"]["slot"][1] = "z_liejin"
	ladder["onb"]["at"]["zhanji"] = 0
	var initial := settle_cards(send({"op": "load", "save": ladder}))
	var rankings := send({"op": "panel", "panel": "rankings"})
	var target: Dictionary = {}
	for entry in rankings["view"]["panel"]["entries"]:
		for button in entry["buttons"]:
			if button.has("duel") and int(button["duel"].get("q", 0)) == 72:
				target = button["duel"]
	assert(not target.is_empty())
	var prep := send({"op": "duel-prepare", "action": "duel", "args": target})
	var ap: int = prep["view"]["ap"]
	assert(prep["view"]["notice"]["kind"] == "duel-prep")
	assert(ap == initial["view"]["ap"])
	assert(not request({"op": "advance"})["ok"])
	var reload := send({"op": "load", "save": prep["save"]})
	assert(reload["view"]["notice"] == prep["view"]["notice"])
	var swapped := send({"op": "duel-action", "move": "equip", "art": "z_qingteng"})
	assert(swapped["save"]["state"]["arts"]["slot"][1] == "z_qingteng")
	assert(swapped["view"]["ap"] == ap)
	var cancelled := send({"op": "duel-action", "move": "cancel"})
	assert(cancelled["view"]["panel"]["id"] == "rankings")
	assert(cancelled["view"]["ap"] == ap)
	send({"op": "duel-prepare", "action": "duel", "args": target})
	var challenge := send({"op": "duel-action", "move": "fight"})
	assert(challenge["view"]["ap"] == ap - 1)
	var settled := settle_cards(challenge)
	assert(settled["save"]["state"]["stats"]["chal"] == 1)
	assert(not request({"op": "duel-action", "move": "fight"})["ok"])
	assert(send({"op": "view"})["save"]["state"]["stats"]["chal"] == 1)

	var old_result: Dictionary = settled["save"].duplicate(true)
	old_result["pending"] = [{"kind": "result", "id": "duel", "data": {"note": "旧版结算"}}]
	assert(send({"op": "load", "save": old_result})["view"]["notice"]["text"] == "旧版结算")
	assert(send({"op": "advance"})["view"]["notice"] == null)

	var pact: Dictionary = base.duplicate(true)
	pact["pact"] = 0
	pact["story"]["bigQ"] = [{"k": "pact"}]
	var scheduled := settle_cards(send({"op": "load", "save": pact}))
	assert(scheduled["view"]["notice"]["kind"] == "duel-prep")
	assert(scheduled["view"]["notice"]["title"] == "三年之约")
	assert(scheduled["view"]["cinema"]["asset"] == "pact-arrival")
	var resumed := send({"op": "load", "save": scheduled["save"]})
	assert(resumed["view"]["notice"] == scheduled["view"]["notice"])
	send({"op": "cinema-done", "token": resumed["view"]["cinema"]["token"]})
	var fought := send({"op": "duel-action", "move": "fight"})
	assert(fought["save"]["state"]["pact"] != 0)
	assert(fought["view"]["cinema"]["asset"] == ("pact-win" if fought["save"]["state"]["pact"] == 1 else "pact-loss"))
	assert(fought["save"]["state"]["story"]["bigQ"].is_empty())
	assert(fought["view"]["ap"] == scheduled["view"]["ap"])
	assert(send({"op": "load", "save": fought["save"]})["view"]["notice"] == fought["view"]["notice"])
	assert(not request({"op": "duel-action", "move": "fight"})["ok"])

	var rival: Dictionary = ladder.duplicate(true)
	rival["rank"] = 70
	rival["quest"]["done"]["c1_m"] = 1
	rival["story"]["chCard"] = 1
	rival["story"]["bigQ"] = [{"k": "foe", "data": "zhao"}]
	var visit := settle_cards(send({"op": "load", "save": rival}))
	assert(visit["view"]["notice"]["title"] == "宿敌上门")
	var deferred := send({"op": "duel-action", "move": "cancel"})
	assert(deferred["save"]["state"]["mainG"]["cd"]["zhao"] > rival["tick"])
	assert(deferred["save"]["state"]["story"]["bigQ"].is_empty())
	assert(deferred["save"]["state"]["stats"].get("chal", 0) == 0)
	send({"op": "load", "save": visit["save"]})
	var free := send({"op": "duel-action", "move": "fight"})
	assert(free["view"]["ap"] == visit["view"]["ap"])
	assert(free["save"]["state"]["stats"]["chal"] == 1)
	assert(free["save"]["state"]["story"]["bigQ"].is_empty())

	var rookie: Dictionary = ladder.duplicate(true)
	rookie["rank"] = 20
	rookie["ladder"][19]["rk"] = "rk1"
	rookie["rv2"]["rk"] = {
		"id": "rk1", "n": "试剑新秀", "s": "试剑宗", "el": "jin", "line": "与你一战",
		"seed": 12, "t0": 0, "climbs": 3, "f": 1, "gear": {"n": "试锋", "aff": "huixin"}, "due": 1,
	}
	rookie["story"]["bigQ"] = [{"k": "rookie"}]
	var rookie_prep := settle_cards(send({"op": "load", "save": rookie}))
	assert(rookie_prep["view"]["notice"]["opponent"] == "试剑新秀")
	var taught := send({"op": "duel-action", "move": "teach"})
	assert(taught["save"]["state"]["rv2"]["teach"] == 1)
	assert(taught["save"]["state"]["rv2"]["rk"] == null)
	send({"op": "load", "save": rookie_prep["save"]})
	var crushed := send({"op": "duel-action", "move": "crush"})
	var rivals: Dictionary = crushed["save"]["state"]["rv2"]
	assert(rivals["crush"] + rivals["lost"] == 1)
	assert(rivals["teach"] == 0 and rivals["rk"] == null)
	assert(crushed["save"]["state"]["story"]["bigQ"].is_empty())


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
	var response := request(message)
	assert(response["ok"], String(response.get("error", "Unknown runtime error")))
	return response


func request(message: Dictionary) -> Dictionary:
	var response = JSON.parse_string(runtime.request(JSON.stringify(message, "", false, true)))
	assert(response is Dictionary, runtime.get_last_error())
	return response
