#!/usr/bin/env python3
"""
Standalone OASIS simulation runner.
Called by the TypeScript agent via shell tool.

Usage:
    python run_oasis.py --profiles profiles.json --platform twitter --rounds 5 --db-path ./sim.db --post-text "..."

Follows MiroFish patterns for OASIS integration.
Outputs JSONL progress events to stdout for real-time streaming.
"""

import argparse
import asyncio
import json
import os
import sys

# Add oasis to path
OASIS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "oasis")
sys.path.insert(0, OASIS_DIR)

import oasis
from oasis.social_platform.typing import ActionType, DefaultPlatformType


def get_model():
    """Create a CAMEL model backend for OASIS agents."""
    from camel.models import ModelFactory
    from camel.types import ModelPlatformType

    provider = os.environ.get("CS_LLM_PROVIDER", "openrouter")
    model_id = os.environ.get("CS_LLM_MODEL", "anthropic/claude-sonnet-4")

    if provider == "openrouter":
        return ModelFactory.create(
            model_platform=ModelPlatformType.OPENAI_COMPATIBLE_MODEL,
            model_type=model_id,
            api_key=os.environ.get("OPENROUTER_API_KEY", os.environ.get("CS_OPENROUTER_API_KEY", "")),
            url=os.environ.get("CS_OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        )
    elif provider == "bedrock":
        return ModelFactory.create(
            model_platform=ModelPlatformType.AWS_BEDROCK,
            model_type=model_id,
        )
    else:
        return ModelFactory.create(
            model_platform=ModelPlatformType.DEFAULT,
            model_type=model_id,
        )


def emit(data: dict):
    """Write a JSON line to stdout for the agent to stream."""
    print(json.dumps(data), flush=True)


# Available actions for each platform (following MiroFish patterns)
TWITTER_ACTIONS = [
    ActionType.CREATE_POST,
    ActionType.LIKE_POST,
    ActionType.UNLIKE_POST,
    ActionType.REPOST,
    ActionType.CREATE_COMMENT,
    ActionType.LIKE_COMMENT,
    ActionType.FOLLOW,
    ActionType.SEARCH_POSTS,
    ActionType.SEARCH_USER,
    ActionType.TREND,
    ActionType.REFRESH,
    ActionType.DO_NOTHING,
]

REDDIT_ACTIONS = [
    ActionType.CREATE_POST,
    ActionType.LIKE_POST,
    ActionType.DISLIKE_POST,
    ActionType.CREATE_COMMENT,
    ActionType.LIKE_COMMENT,
    ActionType.DISLIKE_COMMENT,
    ActionType.SEARCH_POSTS,
    ActionType.SEARCH_USER,
    ActionType.TREND,
    ActionType.REFRESH,
    ActionType.FOLLOW,
    ActionType.DO_NOTHING,
]


async def run_simulation(profiles_path: str, platform: str, rounds: int, db_path: str, post_text: str):
    import sqlite3

    # Load profiles
    with open(profiles_path) as f:
        profiles = json.load(f)

    emit({"type": "progress", "message": f"Building {platform} agent graph with {len(profiles)} agents..."})

    model = get_model()
    available_actions = TWITTER_ACTIONS if platform == "twitter" else REDDIT_ACTIONS
    recsys_type = "twhin-bert" if platform == "twitter" else "reddit"

    # Build agent graph following OASIS generate_reddit_agent_graph pattern
    agent_graph = oasis.AgentGraph()

    for i, p in enumerate(profiles):
        profile_data = {
            "nodes": [],
            "edges": [],
            "other_info": {
                "user_profile": p.get("persona", ""),
                "mbti": p.get("mbti", "ENTJ"),
                "gender": p.get("gender", "nonbinary"),
                "age": p.get("age", 30),
                "country": p.get("country", "US"),
            },
        }

        user_info = oasis.UserInfo(
            name=p.get("username", f"user_{i}"),
            description=p.get("bio", ""),
            profile=profile_data,
            recsys_type=recsys_type,
        )

        agent = oasis.SocialAgent(
            agent_id=i,
            user_info=user_info,
            agent_graph=agent_graph,
            model=model,
            available_actions=available_actions,
        )
        agent_graph.add_agent(agent)

    emit({"type": "progress", "message": f"Initializing {platform} environment..."})

    # Create environment using oasis.make()
    platform_type = DefaultPlatformType.TWITTER if platform == "twitter" else DefaultPlatformType.REDDIT

    env = oasis.make(
        agent_graph=agent_graph,
        platform=platform_type,
        database_path=db_path,
        semaphore=30,  # Limit concurrent LLM requests (following MiroFish pattern)
    )

    await env.reset()

    last_rowid = 0
    id_to_name = {i: p.get("name", f"Agent {i}") for i, p in enumerate(profiles)}
    id_to_archetype = {i: p.get("archetype", "neutral") for i, p in enumerate(profiles)}

    try:
        for r in range(rounds):
            emit({"type": "progress", "message": f"{platform} round {r + 1}/{rounds}"})

            if r == 0:
                # Seed the original post (manual action, following MiroFish pattern)
                first_agent = agent_graph.get_agent(0)
                actions = {
                    first_agent: oasis.ManualAction(
                        action_type=ActionType.CREATE_POST,
                        action_args={"content": post_text},
                    )
                }
                await env.step(actions)

            # All agents take LLM-driven actions (following MiroFish main loop)
            agent_actions = {}
            for _, agent in agent_graph.get_agents():
                agent_actions[agent] = oasis.LLMAction()
            await env.step(agent_actions)

            # Read new actions from trace table and emit
            conn = sqlite3.connect(db_path)
            try:
                cursor = conn.execute(
                    "SELECT rowid, user_id, created_at, action, info "
                    "FROM trace WHERE rowid > ? ORDER BY rowid",
                    (last_rowid,),
                )
                for row in cursor:
                    rowid, user_id, created_at, action, info = row
                    last_rowid = rowid
                    try:
                        info_data = json.loads(info) if info else {}
                    except json.JSONDecodeError:
                        info_data = {"raw": info}

                    emit({
                        "type": "action",
                        "round": r + 1,
                        "agent_id": user_id,
                        "agent_name": id_to_name.get(user_id, f"Agent {user_id}"),
                        "archetype": id_to_archetype.get(user_id, "neutral"),
                        "platform": platform,
                        "action_type": (action or "").upper(),
                        "content": info_data.get("content", info_data.get("raw", "")),
                        "stats": {},
                    })
            finally:
                conn.close()

    finally:
        await env.close()

    emit({"type": "complete", "db_path": db_path, "platform": platform})


def main():
    parser = argparse.ArgumentParser(description="Run OASIS simulation")
    parser.add_argument("--profiles", required=True, help="Path to profiles JSON file")
    parser.add_argument("--platform", required=True, choices=["twitter", "reddit"])
    parser.add_argument("--rounds", type=int, default=5)
    parser.add_argument("--db-path", required=True, help="SQLite DB output path")
    parser.add_argument("--post-text", required=True, help="The post to simulate reactions to")
    args = parser.parse_args()

    asyncio.run(run_simulation(args.profiles, args.platform, args.rounds, args.db_path, args.post_text))


if __name__ == "__main__":
    main()
