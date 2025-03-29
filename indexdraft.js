/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

import { getRoomData } from "roomsAPI/utils/utils"
import Dungeon from "BloomCore/dungeons/Dungeon"
const S02PacketChat = Java.type("net.minecraft.network.play.server.S02PacketChat")

ChatLib.chat("&a[secretCounter] Module loaded!") // ✅ confirm load

let currentRoom = null
let lastChestClicked = null
let recentlySpawnedBats = new Set()
let maxSecrets = 0

register("worldLoad", () => {
    currentRoom = null
    maxSecrets = 0
    recentlySpawnedBats.clear()
})

register("step", () => {
    if (!Dungeon.inDungeon) return

    const room = getRoomData()
    if (!room) return

    if (!currentRoom || currentRoom.name !== room.name) {
        currentRoom = {
            name: room.name,
            fakeSecrets: 0,
            fakeAt: new Set()
        }
        maxSecrets = room.secrets || 0
        recentlySpawnedBats.clear()
    }
}).setFps(2)

register("playerInteract", (action, pos) => {
    if (!Dungeon.inDungeon || action.toString() !== "RIGHT_CLICK_BLOCK") return

    const block = World.getBlockAt(pos.getX(), pos.getY(), pos.getZ())
    if (!block || block.type.getName() !== "Chest") return

    const posStr = `${pos.getX()},${pos.getY()},${pos.getZ()}`
    lastChestClicked = posStr

    if (currentRoom && !currentRoom.fakeAt.has(posStr)) {
        currentRoom.fakeSecrets++
        currentRoom.fakeAt.add(posStr)
    }
})

register("packetReceived", (packet) => {
    const text = packet.func_148915_c().getUnformattedText()
    if (text === "That chest is locked!") {
        if (currentRoom && lastChestClicked && currentRoom.fakeAt.has(lastChestClicked)) {
            currentRoom.fakeSecrets--
            currentRoom.fakeAt.delete(lastChestClicked)
        }
    }
}).setFilteredClass(S02PacketChat)

register("spawnEntity", (entity) => {
    if (entity.getName() === "Bat") {
        const key = `${entity.getX().toFixed(1)},${entity.getY().toFixed(1)},${entity.getZ().toFixed(1)}`
        recentlySpawnedBats.add(key)
        setTimeout(() => recentlySpawnedBats.delete(key), 1000)
    }
})

register("entityDeath", (entity) => {
    if (!Dungeon.inDungeon || !currentRoom) return
    if (entity.getName() !== "Bat") return

    const key = `${entity.getX().toFixed(1)},${entity.getY().toFixed(1)},${entity.getZ().toFixed(1)}`
    if (recentlySpawnedBats.has(key)) return

    if (!currentRoom.fakeAt.has(key)) {
        currentRoom.fakeSecrets++
        currentRoom.fakeAt.add(key)
    }
})

register("itemPickup", () => {
    if (!Dungeon.inDungeon || !currentRoom) return

    const key = `${Math.floor(Player.getX())},${Math.floor(Player.getY())},${Math.floor(Player.getZ())}`
    if (!currentRoom.fakeAt.has(key)) {
        currentRoom.fakeSecrets++
        currentRoom.fakeAt.add(key)
    }
})

register("renderOverlay", () => {
    if (!Dungeon.inDungeon || !currentRoom) return

    const text = `Room: ${currentRoom.name} | Secrets: ${currentRoom.fakeSecrets}/${maxSecrets}`
    const x = Renderer.screen.getWidth() / 2 - Renderer.getStringWidth(text) / 2
    const y = Renderer.screen.getHeight() / 2 + 30

    Renderer.drawStringWithShadow(text, x, y)
})
