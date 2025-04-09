import {
  startServer,
  Audio,
  PlayerEntity,
  PlayerEvent,
  Vector3,
  World,
  Player,
  Entity, // Import Entity
  // Raycast is not directly imported, use world.raycast
  // Input, // Removed unused import
  RigidBodyType, // Import RigidBodyType
  ColliderShape, // Import ColliderShape
  BlockType, // Import BlockType
  ChatEvent, // Import ChatEvent
} from 'hytopia';

// Use the specified boilerplate map
import worldMap from './assets/maps/boilerplate.json';

// --- Lesson & Quiz Data ---
interface Lesson {
  id: string;
  npcName: string; // For potential future use (e.g., NPC dialogue referencing)
  text: string;
}

interface QuizMeta {
  id: string;
  npcName: string;
  topic: string;
  cost: number;
}

const lessons: Lesson[] = [
  { id: 'lesson1', npcName: 'InfoSkeleton', text: 'Bitcoin is a decentralized digital currency, meaning no single entity controls it.' },
  { id: 'lesson2', npcName: 'DataBones', text: 'Transactions are recorded on a public ledger called the blockchain.' },
  { id: 'lesson3', npcName: 'InfoSkeleton', text: 'New bitcoins are created through a process called mining.' },
];

const quizzes: QuizMeta[] = [
  { id: 'quiz1', npcName: 'QuizMind', topic: 'Bitcoin Basics', cost: 1 },
  { id: 'quiz2', npcName: 'QuizMind', topic: 'Blockchain Fundamentals', cost: 2 },
];

// --- State Management ---
interface PlayerState {
    sats: number;
    completedLessons: Set<string>;
}
// Map to track player state (using player.id as the key)
const playerStates = new Map<string, PlayerState>();

// --- NPC Management ---
interface NpcInfo {
    type: 'knowledge' | 'quiz';
    dataId: string; // Corresponds to Lesson.id or QuizMeta.id
}
const npcs = new Map<number, NpcInfo>(); // Key: Entity ID

// --- Helper Functions ---
function updateSats(playerId: string, amount: number): boolean {
    const state = playerStates.get(playerId);
    if (!state) {
        console.warn(`Attempted to update sats for unknown player ID: ${playerId}`);
        return false;
    }
    const newSats = state.sats + amount;
    if (newSats < 0) {
        // Optional: Send message to player they don't have enough sats
        // world.chatManager.sendPlayerMessage(...)
        console.log(`Player ${playerId} attempted transaction resulting in negative sats (${newSats}). Denied.`);
        return false; // Indicate transaction failed
    }
    state.sats = newSats;
    playerStates.set(playerId, state); // Update the map
    console.log(`Updated sats for player ${playerId}. New balance: ${state.sats}`);
    // Optional: Update player UI if displaying sats
    return true; // Indicate transaction succeeded
}

// Removed npcsSpawned flag, spawning moved back to startServer scope

// Removed external spawnNpc function. Spawning logic moved inline into JOINED_WORLD event.

// --- Server Start ---
startServer(world => {
  // world.simulation.enableDebugRendering(true); // Keep commented out

  world.loadMap(worldMap);
  // TODO: Replace with actual cyberpunk plaza map later

  // --- Spawn NPCs (Minimal, in startServer scope) ---
  try {
      // --- InfoSkeleton ---
      const infoSkeleton = new Entity({
          modelUri: 'models/npcs/skeleton.gltf', // Use original skeleton model
          // position removed from constructor
          // name: 'InfoSkeleton', // Keep commented for now
          rigidBodyOptions: {
              type: RigidBodyType.FIXED, // Use FIXED instead of STATIC
              colliders: [
                  // Physical collider to prevent falling
                  { shape: ColliderShape.CYLINDER, radius: 0.5, halfHeight: 1 },
                  // Sensor collider for interaction
                  {
                      shape: ColliderShape.CYLINDER,
                      radius: 1.5, // Larger radius for interaction zone
                      halfHeight: 1.5,
                      isSensor: true,
                      tag: 'interaction-sensor',
                      onCollision: (other: Entity | BlockType, started: boolean) => { // Type should be correct now
                          // Trigger only when collision starts and the other entity is a PlayerEntity
                          if (started && other instanceof PlayerEntity && other.player) {
                              handleNpcInteraction(world, other.player, infoSkeleton.id);
                          }
                      }
                  }
              ]
          }
      });
      // Pass position as second argument to spawn
      infoSkeleton.spawn(world, { x: 5, y: 3, z: 5 }); // Lower spawn height
      if (infoSkeleton.id !== undefined) {
          npcs.set(infoSkeleton.id, { type: 'knowledge', dataId: 'lesson1' });
          console.log(`Spawned knowledge NPC: InfoSkeleton (ID: ${infoSkeleton.id})`);
      } else {
           console.error(`Failed to get ID for spawned NPC: InfoSkeleton`);
           if (infoSkeleton.world) infoSkeleton.despawn();
      }

      // --- DataBones ---
      const dataBones = new Entity({
          modelUri: 'models/npcs/skeleton.gltf',
          // position removed from constructor
          // name: 'DataBones', // Keep commented for now
          rigidBodyOptions: {
              type: RigidBodyType.FIXED, // Use FIXED instead of STATIC
              colliders: [
                  { shape: ColliderShape.CYLINDER, radius: 0.5, halfHeight: 1 },
                  {
                      shape: ColliderShape.CYLINDER,
                      radius: 1.5,
                      halfHeight: 1.5,
                      isSensor: true,
                      tag: 'interaction-sensor',
                      onCollision: (other: Entity | BlockType, started: boolean) => { // Type should be correct now
                          if (started && other instanceof PlayerEntity && other.player) {
                              handleNpcInteraction(world, other.player, dataBones.id);
                          }
                      }
                  }
              ]
          }
      });
      dataBones.spawn(world, { x: -5, y: 3, z: 5 }); // Lower spawn height
      if (dataBones.id !== undefined) {
          npcs.set(dataBones.id, { type: 'knowledge', dataId: 'lesson2' });
          console.log(`Spawned knowledge NPC: DataBones (ID: ${dataBones.id})`);
      } else {
           console.error(`Failed to get ID for spawned NPC: DataBones`);
         if (dataBones.world) dataBones.despawn();
      }

      // --- QuizMind ---
      const quizMind = new Entity({
          modelUri: 'models/npcs/mindflayer.gltf',
          // position removed from constructor
          // name: 'QuizMind', // Keep commented for now
          rigidBodyOptions: {
              type: RigidBodyType.FIXED, // Use FIXED instead of STATIC
              colliders: [
                  { shape: ColliderShape.CYLINDER, radius: 0.5, halfHeight: 1 },
                  {
                      shape: ColliderShape.CYLINDER,
                      radius: 1.5,
                      halfHeight: 1.5,
                      isSensor: true,
                      tag: 'interaction-sensor',
                      onCollision: (other: Entity | BlockType, started: boolean) => { // Type should be correct now
                          if (started && other instanceof PlayerEntity && other.player) {
                              handleNpcInteraction(world, other.player, quizMind.id);
                          }
                      }
                  }
              ]
          }
      });
      quizMind.spawn(world, { x: 0, y: 3, z: -5 }); // Lower spawn height
      if (quizMind.id !== undefined) {
          npcs.set(quizMind.id, { type: 'quiz', dataId: 'quiz1' });
          console.log(`Spawned quiz NPC: QuizMind (ID: ${quizMind.id})`);
      } else {
           console.error(`Failed to get ID for spawned NPC: QuizMind`);
         if (quizMind.world) quizMind.despawn();
      }
  } catch (error) {
      console.error("Error during initial NPC spawning:", error); // Keep this for debugging
  }

  // --- Player Join Logic ---
  world.on(PlayerEvent.JOINED_WORLD, ({ player, world }) => { // Add world to destructuring
    const playerEntity = new PlayerEntity({
      player,
      name: player.username, // Use player's username for the entity name
      modelUri: 'models/players/player.gltf', // Use default player model
      // modelLoopedAnimations: ['idle'], // Optional: Add if model has idle animation
      // modelScale: 0.5, // Optional: Adjust scale if needed
    });

    // Spawn the player entity at the specified starting location
    // Adjust Y coordinate (5) if needed based on the boilerplate map's ground level
    playerEntity.spawn(world, new Vector3(0, 5, 0));

    // Initialize player sat balance AFTER spawning and confirming ID
    if (playerEntity.player?.id === undefined) {
        console.error(`Player entity for ${player.username} has no player ID after spawn. Cannot track state.`);
        // Attempt to despawn if possible, though spawn might have failed
        if (playerEntity.world) playerEntity.despawn();
        return; // Stop processing this player
    }

    const playerId = playerEntity.player.id;
    // Initialize player state with sats and completed lessons
    playerStates.set(playerId, { sats: 5, completedLessons: new Set<string>() });
    console.log(`Player ${player.username} (ID: ${playerId}) joined. Initialized with 5 sats and empty lesson set.`);

    // Send welcome messages
    world.chatManager.sendPlayerMessage(player, 'Welcome to the Bitcoin Learning Game!', '00FF00'); // Green
    world.chatManager.sendPlayerMessage(player, `You start with 5 sats. Interact with NPCs (Default: E key) to learn and earn!`, 'FFFF00'); // Yellow
    // Removed delayed NPC spawning logic

// Optional: Load UI if needed later
// player.ui.load('ui/some-ui.html');

}); // END JOINED_WORLD

  // --- Player Leave Logic ---
  world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
    // Despawn all entities associated with the player
    const entitiesToDespawn = world.entityManager.getPlayerEntitiesByPlayer(player);
    console.log(`Player ${player.username} left. Despawning ${entitiesToDespawn.length} associated entities.`);
    entitiesToDespawn.forEach(entity => {
        if (entity.world) {
             console.log(`Despawning entity ${entity.id} for leaving player ${player.username}`);
             entity.despawn();
        }
    });

    // Remove player's sat state when they leave
    if (player.id !== undefined) {
        if (playerStates.delete(player.id)) {
            console.log(`Removed state for player ${player.username} (ID: ${player.id}).`);
        } else {
             console.warn(`Could not find state for leaving player ${player.username} (ID: ${player.id}).`);
        }
    } else {
        console.error(`Leaving player ${player.username} has undefined ID. Cannot remove state.`);
    }
  }); // END LEFT_WORLD

  // --- Ambient Audio (Optional) ---
  // Keep or modify as needed for the new game's atmosphere
  new Audio({
    uri: 'audio/music/hytopia-main.mp3', // Consider changing this later
    loop: true,
    volume: 0.1,
  }).play(world);

// --- NPC Interaction Logic (Called by Sensor Colliders) ---
function handleNpcInteraction(world: World, player: Player, npcEntityId: number | undefined) {
    if (npcEntityId === undefined) return;

    const npcInfo = npcs.get(npcEntityId);
    if (!npcInfo) {
        console.warn(`Collision with unknown NPC entity ID: ${npcEntityId}`);
        return;
    }

    const playerId = player.id;
    if (playerId === undefined) {
        console.error(`Player ${player.username} has undefined ID during interaction.`);
        return;
    }
    const playerState = playerStates.get(playerId);
    if (!playerState) {
        console.error(`Player state not found for player ${player.username} (ID: ${playerId}) during interaction.`);
        return; // Should not happen if JOINED_WORLD logic is correct
    }

    console.log(`Player ${player.username} collided with known NPC ID: ${npcEntityId}, type: ${npcInfo.type}`);

    if (npcInfo.type === 'knowledge') {
        const lesson = lessons.find(l => l.id === npcInfo.dataId);
        if (lesson) {
            world.chatManager.sendPlayerMessage(player, `[${lesson.npcName}]: ${lesson.text}`, 'ADD8E6'); // Light Blue

            if (!playerState.completedLessons.has(lesson.id)) {
                playerState.completedLessons.add(lesson.id);
                if (updateSats(playerId, 1)) { // Award 1 sat
                    world.chatManager.sendPlayerMessage(player, `+1 Sat! Lesson complete. Your balance: ${playerState.sats} sats.`, '00FF00'); // Green
                } else {
                    world.chatManager.sendPlayerMessage(player, `Lesson complete, but failed to update sats.`, 'FF0000'); // Red
                }
            } else {
                world.chatManager.sendPlayerMessage(player, `You have already learned this lesson.`, 'FFFF00'); // Yellow
            }
        } else {
            console.error(`Knowledge NPC (ID: ${npcEntityId}) has invalid dataId: ${npcInfo.dataId}`);
            world.chatManager.sendPlayerMessage(player, `[System]: Error retrieving lesson data.`, 'FF0000');
        }
    } else if (npcInfo.type === 'quiz') {
        const quiz = quizzes.find(q => q.id === npcInfo.dataId);
        if (quiz) {
            // Only inform the player about the quiz on collision
            world.chatManager.sendPlayerMessage(player, `[${quiz.npcName}]: This is the ${quiz.topic} quiz. Type /startquiz ${quiz.id} to begin (Cost: ${quiz.cost} sat).`, 'FFA500'); // Orange
        } else {
            console.error(`Quiz NPC (ID: ${npcEntityId}) has invalid dataId: ${npcInfo.dataId}`);
            world.chatManager.sendPlayerMessage(player, `[System]: Error retrieving quiz data.`, 'FF0000');
        }
    }
}

// --- Chat Command Handling ---
  world.chatManager.on(ChatEvent.BROADCAST_MESSAGE, ({ player, message }) => { // Revert to using 'message'
      if (!player || player.id === undefined) return; // Ignore non-player messages or players without ID

      if (message.startsWith('/startquiz ')) {
          const quizId = message.substring('/startquiz '.length).trim();
          const quiz = quizzes.find(q => q.id === quizId);

          if (quiz) {
              const playerId = player.id;
              const playerState = playerStates.get(playerId);

              if (!playerState) {
                  world.chatManager.sendPlayerMessage(player, `[System]: Your state could not be found. Please rejoin.`, 'FF0000');
                  return;
              }

              if (playerState.sats >= quiz.cost) {
                  if (updateSats(playerId, -quiz.cost)) { // Deduct cost
                      world.chatManager.sendPlayerMessage(player, `Starting quiz "${quiz.topic}"... Cost: ${quiz.cost} sats deducted. Your balance: ${playerState.sats} sats.`, '00FF00');
                      // TODO: Implement actual quiz logic here (send questions, track answers, timer, etc.)
                      world.chatManager.sendPlayerMessage(player, `(Quiz logic not yet implemented!)`, 'FFFF00');
                  } else {
                      // This case should ideally not happen if the check above passed, but good practice
                      world.chatManager.sendPlayerMessage(player, `Failed to deduct sats for quiz "${quiz.topic}". Please try again.`, 'FF0000');
                  }
              } else {
                  world.chatManager.sendPlayerMessage(player, `You don't have enough sats to start the "${quiz.topic}" quiz. Cost: ${quiz.cost} sats. You have: ${playerState.sats} sats.`, 'FF0000');
              }
          } else {
              world.chatManager.sendPlayerMessage(player, `Quiz with ID "${quizId}" not found.`, 'FF0000');
          }
      }
      // Add other command handlers here if needed
  });


  // --- Ambient Audio (Optional) ---
  // Keep or modify as needed for the new game's atmosphere
  new Audio({
    uri: 'audio/music/hytopia-main.mp3', // Consider changing this later
    loop: true,
    volume: 0.1,
  }).play(world);

  console.log("Bitcoin Learning Game server initialized with NPCs and chat commands.");
}); // END startServer
