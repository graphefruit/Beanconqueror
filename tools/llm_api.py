#!/usr/bin/env /workspace/tmp_windsurf/venv/bin/python3

import google.generativeai as genai
from openai import OpenAI, AzureOpenAI
from anthropic import Anthropic
import argparse
import os
from dotenv import load_dotenv
from pathlib import Path
import sys
import base64
from typing import Optional, Union, List
import mimetypes

def load_environment():
    """Load environment variables from .env files in order of precedence"""
    # Order of precedence:
    # 1. System environment variables (already loaded)
    # 2. .env.local (user-specific overrides)
    # 3. .env (project defaults)
    # 4. .env.example (example configuration)
    
    env_files = ['.env.local', '.env', '.env.example']
    env_loaded = False
    
    print("Current working directory:", Path('.').absolute(), file=sys.stderr)
    print("Looking for environment files:", env_files, file=sys.stderr)
    
    for env_file in env_files:
        env_path = Path('.') / env_file
        print(f"Checking {env_path.absolute()}", file=sys.stderr)
        if env_path.exists():
            print(f"Found {env_file}, loading variables...", file=sys.stderr)
            load_dotenv(dotenv_path=env_path)
            env_loaded = True
            print(f"Loaded environment variables from {env_file}", file=sys.stderr)
            # Print loaded keys (but not values for security)
            with open(env_path) as f:
                keys = [line.split('=')[0].strip() for line in f if '=' in line and not line.startswith('#')]
                print(f"Keys loaded from {env_file}: {keys}", file=sys.stderr)
    
    if not env_loaded:
        print("Warning: No .env files found. Using system environment variables only.", file=sys.stderr)
        print("Available system environment variables:", list(os.environ.keys()), file=sys.stderr)

# Load environment variables at module import
load_environment()

def encode_image_file(image_path: str) -> tuple[str, str]:
    """
    Encode an image file to base64 and determine its MIME type.
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        tuple: (base64_encoded_string, mime_type)
    """
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        mime_type = 'image/png'  # Default to PNG if type cannot be determined
        
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
    return encoded_string, mime_type

def create_llm_client(provider="openai"):
    if provider == "openai":
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        return OpenAI(
            api_key=api_key
        )
    elif provider == "azure":
        api_key = os.getenv('AZURE_OPENAI_API_KEY')
        if not api_key:
            raise ValueError("AZURE_OPENAI_API_KEY not found in environment variables")
        return AzureOpenAI(
            api_key=api_key,
            api_version="2024-08-01-preview",
            azure_endpoint="https://msopenai.openai.azure.com"
        )
    elif provider == "deepseek":
        api_key = os.getenv('DEEPSEEK_API_KEY')
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in environment variables")
        return OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com/v1",
        )
    elif provider == "siliconflow":
        api_key = os.getenv('SILICONFLOW_API_KEY')
        if not api_key:
            raise ValueError("SILICONFLOW_API_KEY not found in environment variables")
        return OpenAI(
            api_key=api_key,
            base_url="https://api.siliconflow.cn/v1"
        )
    elif provider == "anthropic":
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
        return Anthropic(
            api_key=api_key
        )
    elif provider == "gemini":
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)
        return genai
    elif provider == "local":
        return OpenAI(
            base_url="http://192.168.180.137:8006/v1",
            api_key="not-needed"
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")

def query_llm(prompt: str, client=None, model=None, provider="openai", image_path: Optional[str] = None) -> Optional[str]:
    """
    Query an LLM with a prompt and optional image attachment.
    
    Args:
        prompt (str): The text prompt to send
        client: The LLM client instance
        model (str, optional): The model to use
        provider (str): The API provider to use
        image_path (str, optional): Path to an image file to attach
        
    Returns:
        Optional[str]: The LLM's response or None if there was an error
    """
    if client is None:
        client = create_llm_client(provider)
    
    try:
        # Set default model
        if model is None:
            if provider == "openai":
                model = "gpt-4o"
            elif provider == "azure":
                model = os.getenv('AZURE_OPENAI_MODEL_DEPLOYMENT', 'gpt-4o-ms')  # Get from env with fallback
            elif provider == "deepseek":
                model = "deepseek-chat"
            elif provider == "siliconflow":
                model = "deepseek-ai/DeepSeek-R1"
            elif provider == "anthropic":
                model = "claude-3-7-sonnet-20250219"
            elif provider == "gemini":
                model = "gemini-2.0-flash-exp"
            elif provider == "local":
                model = "Qwen/Qwen2.5-32B-Instruct-AWQ"
        
        if provider in ["openai", "local", "deepseek", "azure", "siliconflow"]:
            messages = [{"role": "user", "content": []}]
            
            # Add text content
            messages[0]["content"].append({
                "type": "text",
                "text": prompt
            })
            
            # Add image content if provided
            if image_path:
                if provider == "openai":
                    encoded_image, mime_type = encode_image_file(image_path)
                    messages[0]["content"] = [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded_image}"}}
                    ]
            
            kwargs = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
            }
            
            # Add o1-specific parameters
            if model == "o1":
                kwargs["response_format"] = {"type": "text"}
                kwargs["reasoning_effort"] = "low"
                del kwargs["temperature"]
            
            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
            
        elif provider == "anthropic":
            messages = [{"role": "user", "content": []}]
            
            # Add text content
            messages[0]["content"].append({
                "type": "text",
                "text": prompt
            })
            
            # Add image content if provided
            if image_path:
                encoded_image, mime_type = encode_image_file(image_path)
                messages[0]["content"].append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": encoded_image
                    }
                })
            
            response = client.messages.create(
                model=model,
                max_tokens=1000,
                messages=messages
            )
            return response.content[0].text
            
        elif provider == "gemini":
            model = client.GenerativeModel(model)
            if image_path:
                file = genai.upload_file(image_path, mime_type="image/png")
                chat_session = model.start_chat(
                    history=[{
                        "role": "user",
                        "parts": [file, prompt]
                    }]
                )
            else:
                chat_session = model.start_chat(
                    history=[{
                        "role": "user",
                        "parts": [prompt]
                    }]
                )
            response = chat_session.send_message(prompt)
            return response.text
            
    except Exception as e:
        print(f"Error querying LLM: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description='Query an LLM with a prompt')
    parser.add_argument('--prompt', type=str, help='The prompt to send to the LLM', required=True)
    parser.add_argument('--provider', choices=['openai','anthropic','gemini','local','deepseek','azure','siliconflow'], default='openai', help='The API provider to use')
    parser.add_argument('--model', type=str, help='The model to use (default depends on provider)')
    parser.add_argument('--image', type=str, help='Path to an image file to attach to the prompt')
    args = parser.parse_args()

    if not args.model:
        if args.provider == 'openai':
            args.model = "gpt-4o" 
        elif args.provider == "deepseek":
            args.model = "deepseek-chat"
        elif args.provider == "siliconflow":
            args.model = "deepseek-ai/DeepSeek-R1"
        elif args.provider == 'anthropic':
            args.model = "claude-3-7-sonnet-20250219"
        elif args.provider == 'gemini':
            args.model = "gemini-2.0-flash-exp"
        elif args.provider == 'azure':
            args.model = os.getenv('AZURE_OPENAI_MODEL_DEPLOYMENT', 'gpt-4o-ms')  # Get from env with fallback

    client = create_llm_client(args.provider)
    response = query_llm(args.prompt, client, model=args.model, provider=args.provider, image_path=args.image)
    if response:
        print(response)
    else:
        print("Failed to get response from LLM")

if __name__ == "__main__":
    main()