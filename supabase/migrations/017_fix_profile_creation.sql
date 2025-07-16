-- Fix profile creation function to handle Google OAuth properly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile with proper Google OAuth data handling
    INSERT INTO profiles (
        id,
        email,
        full_name,
        avatar_url,
        is_admin,
        admin_level,
        notification_preferences,
        privacy_settings,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'name',
            NEW.email
        ),
        NEW.raw_user_meta_data->>'avatar_url',
        CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
        CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
        '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}',
        '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also handle updates for OAuth users
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile when user metadata changes (e.g., Google OAuth updates)
    UPDATE profiles SET
        email = NEW.email,
        full_name = COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'name',
            profiles.full_name
        ),
        avatar_url = COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            profiles.avatar_url
        ),
        updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();