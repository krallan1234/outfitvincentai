import { supabase } from '@/integrations/supabase/client';
import { UserPreferences } from '@/types/generator';
import { Outfit } from '@/types/outfit';

// ============================================
// AUTH API
// ============================================

export const authApi = {
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ============================================
// PROFILES API
// ============================================

export const profilesApi = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('body_type, style_preferences, favorite_colors, location, gender, skin_tone')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data as UserPreferences;
  },

  async updateProfile(userId: string, updates: Partial<UserPreferences>) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);
    
    if (error) throw error;
  }
};

// ============================================
// OUTFITS API
// ============================================

export const outfitsApi = {
  async fetchOutfits(userId: string) {
    const { data, error } = await supabase
      .from('outfits')
      .select(`
        *,
        outfit_items (
          id,
          clothes (
            id,
            image_url,
            category,
            analysis
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Outfit[];
  },

  async deleteOutfit(outfitId: string) {
    const { error } = await supabase
      .from('outfits')
      .delete()
      .eq('id', outfitId);

    if (error) throw error;
  },

  async generateOutfit(params: {
    prompt: string;
    occasion?: string;
    weather?: any;
    selectedItems?: any[];
    pinterestContext?: string;
    pinterestPins?: any[];
    preferences?: UserPreferences;
  }) {
    const { data, error } = await supabase.functions.invoke('generate-outfit', {
      body: params
    });

    if (error) throw error;
    return data;
  }
};

// ============================================
// CLOTHES API
// ============================================

export const clothesApi = {
  async fetchClothes(userId: string) {
    const { data, error } = await supabase
      .from('clothes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async uploadClothingImage(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('clothes')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('clothes')
      .getPublicUrl(fileName);

    return { fileName, publicUrl };
  },

  async deleteClothingItem(id: string, imagePath?: string) {
    // Delete from database
    const { error: dbError } = await supabase
      .from('clothes')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    // Delete from storage if path provided
    if (imagePath) {
      await supabase.storage
        .from('clothes')
        .remove([imagePath]);
    }
  }
};

// ============================================
// CALENDAR API
// ============================================

export const calendarApi = {
  async fetchEntries(userId: string) {
    const { data, error } = await supabase
      .from('outfit_calendar')
      .select(`
        *,
        outfit:outfits (
          id,
          title,
          generated_image_url
        )
      `)
      .eq('user_id', userId)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  async addEntry(userId: string, outfitId: string, date: Date, notes?: string) {
    const { data, error } = await supabase
      .from('outfit_calendar')
      .insert({
        user_id: userId,
        outfit_id: outfitId,
        scheduled_date: date.toISOString(),
        notes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEntry(entryId: string, date: Date, notes?: string) {
    const { error } = await supabase
      .from('outfit_calendar')
      .update({
        scheduled_date: date.toISOString(),
        notes
      })
      .eq('id', entryId);

    if (error) throw error;
  },

  async deleteEntry(entryId: string) {
    const { error } = await supabase
      .from('outfit_calendar')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  }
};

// ============================================
// COMMUNITY API
// ============================================

export const communityApi = {
  async fetchCommunityOutfits(limit = 20) {
    const { data, error } = await supabase
      .from('outfits')
      .select(`
        *,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async toggleLike(userId: string, outfitId: string) {
    // Check if already liked
    const { data: existing } = await supabase
      .from('outfit_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('outfit_id', outfitId)
      .single();

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('outfit_likes')
        .delete()
        .eq('user_id', userId)
        .eq('outfit_id', outfitId);
      
      if (error) throw error;
      return false;
    } else {
      // Like
      const { error } = await supabase
        .from('outfit_likes')
        .insert({ user_id: userId, outfit_id: outfitId });
      
      if (error) throw error;
      return true;
    }
  },

  async fetchComments(outfitId: string) {
    const { data, error } = await supabase
      .from('outfit_comments')
      .select(`
        *,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .eq('outfit_id', outfitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async addComment(userId: string, outfitId: string, content: string) {
    const { data, error } = await supabase
      .from('outfit_comments')
      .insert({
        user_id: userId,
        outfit_id: outfitId,
        comment_text: content
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// ============================================
// FOLLOW API
// ============================================

export const followApi = {
  async fetchFollowing(userId: string) {
    const { data, error } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error) throw error;
    return data.map(f => f.following_id);
  },

  async toggleFollow(followerId: string, followingId: string) {
    // Check if already following
    const { data: existing } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existing) {
      // Unfollow
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      
      if (error) throw error;
      return false;
    } else {
      // Follow
      const { error } = await supabase
        .from('user_follows')
        .insert({ follower_id: followerId, following_id: followingId });
      
      if (error) throw error;
      return true;
    }
  }
};
