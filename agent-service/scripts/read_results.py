#!/usr/bin/env python3
"""
Read OASIS simulation results from SQLite databases.
Called by the TypeScript agent via shell tool.

Matches the actual OASIS database schema:
  - user (user_id, agent_id, user_name, name, bio, num_followings, num_followers)
  - post (post_id, user_id, content, num_likes, num_dislikes, num_shares)
  - comment (comment_id, post_id, user_id, content, num_likes, num_dislikes)
  - follow (follow_id, follower_id, followee_id)
  - trace (user_id, created_at, action, info)
  - like, dislike, report, rec, etc.

Usage:
    python read_results.py --db-paths twitter=./twitter.db,reddit=./reddit.db --profiles profiles.json
"""

import argparse
import json
import sqlite3


def read_summary(db_paths: dict, profiles: list) -> str:
    id_to_profile = {p.get("agent_id", i): p for i, p in enumerate(profiles)}
    sections = []

    for platform, db_path in db_paths.items():
        conn = sqlite3.connect(db_path)
        try:
            # Check which tables exist
            tables = {row[0] for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()}

            section = f"### {platform.upper()}\n\n"

            # Posts
            if "post" in tables:
                posts = conn.execute(
                    "SELECT user_id, content, num_likes, num_dislikes, num_shares "
                    "FROM post ORDER BY (num_likes + num_shares) DESC"
                ).fetchall()
                total_likes = sum(p[2] for p in posts)
                total_dislikes = sum(p[3] for p in posts)
                total_shares = sum(p[4] for p in posts)
                section += f"**Posts**: {len(posts)}\n"
                section += f"**Engagement**: {total_likes} likes, {total_dislikes} dislikes, {total_shares} shares\n"

                section += "\n**Top Posts (by engagement):**\n"
                for user_id, content, likes, dislikes, shares in posts[:8]:
                    profile = id_to_profile.get(user_id, {})
                    author = profile.get("name", f"User {user_id}")
                    archetype = profile.get("archetype", "unknown")
                    bias = profile.get("sentiment_bias", 0)
                    content_preview = (content or "")[:150]
                    section += (
                        f'- [{archetype}, bias={bias:.1f}] @{author}: '
                        f'"{content_preview}" '
                        f"(likes={likes}, dislikes={dislikes}, shares={shares})\n"
                    )

            # Comments
            if "comment" in tables:
                comments = conn.execute(
                    "SELECT user_id, content, num_likes, num_dislikes "
                    "FROM comment ORDER BY num_likes DESC"
                ).fetchall()
                section += f"\n**Comments**: {len(comments)}\n"
                if comments:
                    section += "**Top Comments:**\n"
                    for user_id, content, likes, dislikes in comments[:5]:
                        profile = id_to_profile.get(user_id, {})
                        author = profile.get("name", f"User {user_id}")
                        content_preview = (content or "")[:120]
                        section += f'- @{author}: "{content_preview}" (likes={likes})\n'

            # Follows
            if "follow" in tables:
                follow_count = conn.execute("SELECT COUNT(*) FROM follow").fetchone()[0]
                section += f"\n**New follows**: {follow_count}\n"

            # Action breakdown from trace
            if "trace" in tables:
                traces = conn.execute(
                    "SELECT action, COUNT(*) FROM trace GROUP BY action ORDER BY COUNT(*) DESC"
                ).fetchall()
                section += "\n**Action breakdown**: "
                section += ", ".join(f"{a}: {c}" for a, c in traces)
                section += "\n"

                # Agent activity summary
                agent_activity = conn.execute(
                    "SELECT user_id, COUNT(*) as action_count FROM trace GROUP BY user_id ORDER BY action_count DESC"
                ).fetchall()
                section += "\n**Most active agents**:\n"
                for user_id, count in agent_activity[:5]:
                    profile = id_to_profile.get(user_id, {})
                    name = profile.get("name", f"User {user_id}")
                    archetype = profile.get("archetype", "unknown")
                    section += f"- {name} ({archetype}): {count} actions\n"

            sections.append(section)
        finally:
            conn.close()

    return "\n---\n\n".join(sections)


def main():
    parser = argparse.ArgumentParser(description="Read OASIS simulation results")
    parser.add_argument("--db-paths", required=True,
                        help="Comma-separated platform=path pairs")
    parser.add_argument("--profiles", required=True, help="Path to profiles JSON file")
    args = parser.parse_args()

    db_paths = {}
    for pair in args.db_paths.split(","):
        platform, path = pair.strip().split("=", 1)
        db_paths[platform.strip()] = path.strip()

    with open(args.profiles) as f:
        profiles = json.load(f)

    summary = read_summary(db_paths, profiles)
    print(summary)


if __name__ == "__main__":
    main()
