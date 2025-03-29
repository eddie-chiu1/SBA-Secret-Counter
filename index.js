/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

import { getRoomData } from "roomsAPI/utils/utils"
import Dungeon from "BloomCore/dungeons/Dungeon"

const S02PacketChat = Java.type("net.minecraft.network.play.server.S02PacketChat")

let currentRoom = null
let lastChestClicked = null
let currentSecrets = 0
let maxSecrets = 0

// Reset on world load
register("worldLoad", () => {
    currentRoom = null
    currentSecrets = 0
    maxSecrets = 0
})

// Detect when entering a new room
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

        currentSecrets = 0
        maxSecrets = room.secrets || 0
    }
}).setFps(2)


// Detect chest click
register("playerInteract", (action, pos) => {
    if (!Dungeon.inDungeon || action.toString() !== "RIGHT_CLICK_BLOCK") return

    const block = World.getBlockAt(pos.getX(), pos.getY(), pos.getZ())
    if (!block || block.type.getName() !== "Chest") return

    const posStr = `${pos.getX()},${pos.getY()},${pos.getZ()}`
    lastChestClicked = posStr

    // Only add if not already clicked
    if (currentRoom && !currentRoom.fakeAt.has(posStr)) {
        currentRoom.fakeSecrets++
        currentRoom.fakeAt.add(posStr)
    }
})

// Listen for "That chest is locked!" message
register("packetReceived", (packet) => {
    if (!(packet instanceof S02PacketChat)) return

    const text = packet.func_148915_c().getUnformattedText()
    if (text === "That chest is locked!") {
        if (currentRoom && lastChestClicked && currentRoom.fakeAt.has(lastChestClicked)) {
            currentRoom.fakeSecrets--
            currentRoom.fakeAt.delete(lastChestClicked)
        }
    }
}).setFilteredClass(S02PacketChat)


// Display GUI
register("renderOverlay", () => {
    if (!Dungeon.inDungeon || !currentRoom) return

    const display = `Room: ${currentRoom.name} | Secrets: ${currentRoom.fakeSecrets}/${maxSecrets}`
    const x = Renderer.screen.getWidth() / 2 - Renderer.getStringWidth(display) / 2
    const y = Renderer.screen.getHeight() / 2 + 30

    Renderer.drawStringWithShadow(display, x, y)
})



ChatLib.chat("&a[Secretscounter] Module loaded successfully. (ver 1.0.0)");