-- Migration 003: Add 'login' purpose to otp_purpose enum
ALTER TYPE otp_purpose ADD VALUE IF NOT EXISTS 'login';
