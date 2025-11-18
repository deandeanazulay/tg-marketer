#!/usr/bin/env python3
"""
Generate a new MASTER_KEY for session encryption
Run this script to create a secure random key for your .env file
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.app.core.encryption import generate_master_key

if __name__ == "__main__":
    key = generate_master_key()
    print("Generated new MASTER_KEY:")
    print(f"MASTER_KEY={key}")
    print("\nAdd this line to your .env file")
    print("Keep this key secure - losing it means losing access to all encrypted sessions!")