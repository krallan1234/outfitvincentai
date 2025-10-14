import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Package, Sparkles, Check, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useOutfits } from '@/hooks/useOutfits';

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [packingLists, setPackingLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showPackingDialog, setShowPackingDialog] = useState(false);
  const { toast } = useToast();
  const { outfits } = useOutfits();

  useEffect(() => {
    loadSchedules();
    loadPackingLists();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('outfit_schedules')
        .select('*, outfits(id, title, generated_image_url)')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadPackingLists = async () => {
    try {
      const { data, error } = await supabase
        .from('packing_lists')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setPackingLists(data || []);
    } catch (error: any) {
      console.error('Error loading packing lists:', error);
    }
  };

  const scheduleOutfit = async (outfitId: string, date: Date, occasion: string, notes: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('outfit_schedules')
        .insert({
          user_id: user.id,
          outfit_id: outfitId,
          scheduled_date: format(date, 'yyyy-MM-dd'),
          occasion,
          notes
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Outfit scheduled!' });
      loadSchedules();
      setShowScheduleDialog(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const markAsWorn = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('outfit_schedules')
        .update({ is_worn: true, worn_at: new Date().toISOString() })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({ title: 'Marked as worn', description: 'Outfit marked as worn' });
      loadSchedules();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const tileContent = ({ date, view }: any) => {
    if (view !== 'month') return null;

    const dateStr = format(date, 'yyyy-MM-dd');
    const daySchedules = schedules.filter(s => s.scheduled_date === dateStr);

    if (daySchedules.length === 0) return null;

    return (
      <div className="flex flex-col gap-1 mt-1">
        {daySchedules.slice(0, 2).map((schedule, idx) => (
          <div
            key={idx}
            className={`w-full h-1 rounded ${schedule.is_worn ? 'bg-green-500' : 'bg-primary'}`}
          />
        ))}
        {daySchedules.length > 2 && (
          <div className="text-xs text-center">+{daySchedules.length - 2}</div>
        )}
      </div>
    );
  };

  const selectedDateSchedules = schedules.filter(
    s => s.scheduled_date === format(selectedDate, 'yyyy-MM-dd')
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Outfit Planner</h1>
            <p className="text-muted-foreground">Schedule and plan your outfits</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Schedule Outfit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <ScheduleOutfitDialog
                  outfits={outfits}
                  selectedDate={selectedDate}
                  onSchedule={scheduleOutfit}
                  onClose={() => setShowScheduleDialog(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={showPackingDialog} onOpenChange={setShowPackingDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Create Packing List
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <PackingListDialog
                  onClose={() => {
                    setShowPackingDialog(false);
                    loadPackingLists();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>View and manage your outfit schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                onChange={(value: any) => setSelectedDate(value)}
                value={selectedDate}
                tileContent={tileContent}
                className="w-full border rounded-lg"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
              <CardDescription>Scheduled outfits for this day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDateSchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No outfits scheduled for this day
                </p>
              ) : (
                selectedDateSchedules.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4 space-y-2">
                    {schedule.outfits?.generated_image_url && (
                      <img
                        src={schedule.outfits.generated_image_url}
                        alt={schedule.outfits.title}
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                    <h4 className="font-semibold">{schedule.outfits?.title || 'Outfit'}</h4>
                    {schedule.occasion && (
                      <p className="text-sm text-muted-foreground">{schedule.occasion}</p>
                    )}
                    {schedule.notes && (
                      <p className="text-sm">{schedule.notes}</p>
                    )}
                    <div className="flex gap-2">
                      {!schedule.is_worn ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsWorn(schedule.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark as Worn
                        </Button>
                      ) : (
                        <div className="flex items-center text-sm text-green-600">
                          <Check className="h-4 w-4 mr-1" />
                          Worn on {format(new Date(schedule.worn_at), 'MMM d')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {packingLists.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Packing Lists</CardTitle>
              <CardDescription>View your upcoming trips and packing suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {packingLists.map((list) => (
                  <PackingListCard key={list.id} list={list} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ScheduleOutfitDialog({ outfits, selectedDate, onSchedule, onClose }: any) {
  const [selectedOutfit, setSelectedOutfit] = useState('');
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <>
      <DialogHeader>
        <DialogTitle>Schedule Outfit</DialogTitle>
        <DialogDescription>
          Schedule an outfit for {format(selectedDate, 'MMMM d, yyyy')}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Select Outfit</Label>
          <select
            className="w-full mt-1 p-2 border rounded-md"
            value={selectedOutfit}
            onChange={(e) => setSelectedOutfit(e.target.value)}
          >
            <option value="">Choose an outfit...</option>
            {outfits.map((outfit: any) => (
              <option key={outfit.id} value={outfit.id}>
                {outfit.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="occasion">Occasion</Label>
          <Input
            id="occasion"
            placeholder="e.g., Office meeting, Date night..."
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSchedule(selectedOutfit, selectedDate, occasion, notes)}
            disabled={!selectedOutfit}
          >
            Schedule
          </Button>
        </div>
      </div>
    </>
  );
}

function PackingListDialog({ onClose }: any) {
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [packingList, setPackingList] = useState('');
  const { toast } = useToast();

  const generatePackingList = async () => {
    if (!tripName || !startDate || !endDate) {
      toast({ title: 'Missing info', description: 'Please fill in trip details', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: clothesData } = await supabase
        .from('clothes')
        .select('category, color, brand')
        .limit(20);

      const { data, error } = await supabase.functions.invoke('generate-packing-list', {
        body: {
          destination,
          startDate,
          endDate,
          occasion,
          wardrobeItems: clothesData || []
        }
      });

      if (error) throw error;

      setPackingList(data.packingList);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('packing_lists').insert({
          user_id: user.id,
          trip_name: tripName,
          destination,
          start_date: startDate,
          end_date: endDate,
          occasion,
          ai_suggestions: data.packingList
        });
      }

      toast({ title: 'Success', description: 'Packing list generated!' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Packing List</DialogTitle>
        <DialogDescription>
          Generate smart packing suggestions for your trip
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="tripName">Trip Name</Label>
          <Input
            id="tripName"
            placeholder="Summer Vacation 2025"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            placeholder="Paris, France"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="occasion">Occasion</Label>
          <Input
            id="occasion"
            placeholder="Beach vacation, Business trip..."
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          onClick={generatePackingList}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Packing List
            </>
          )}
        </Button>

        {packingList && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Your Packing List</h4>
            <div className="text-sm whitespace-pre-wrap">{packingList}</div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
}

function PackingListCard({ list }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{list.trip_name}</CardTitle>
        <CardDescription>
          {list.destination && `${list.destination} • `}
          {format(new Date(list.start_date), 'MMM d')} - {format(new Date(list.end_date), 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {list.occasion && (
          <p className="text-sm font-medium mb-2">{list.occasion}</p>
        )}
        {list.ai_suggestions && (
          <div className="text-sm text-muted-foreground line-clamp-3">
            {list.ai_suggestions.substring(0, 150)}...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
