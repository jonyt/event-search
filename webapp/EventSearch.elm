module EventSearch exposing (..)

import Browser exposing (element)
import Html exposing (..)
import Html.Attributes exposing (style, href, placeholder, value, type_, title, target)
import Html.Events.Extra exposing (onEnter)
import Html.Events exposing (onClick, onInput)
import Date exposing (Date, fromPosix)
import DatePicker exposing (..)
import Http exposing (get, Error)
import Json.Decode as JD exposing (Decoder, list, string, decodeString)
import Url.Builder as U exposing (..)
-- import Time.Month
import Time exposing (Posix, Zone, Month(..), now, millisToPosix, utc, toYear, toMonth, toDay, toHour, toMinute)
import Task exposing (..)

type alias Event = {
    name: String
    , description: String
    , location: String
    , source: String
    , time: Int
    , url: String
    }

type alias Model = {
    freeText : Maybe String
    , city : String 
    , fromDatePicker : DatePicker 
    , fromDate: Maybe Date 
    , events: List Event
    , cities: List String
    , state: State
    , timeZone : Maybe Zone
    }

type Msg = Submit |
  Change String |
  EnterPressed |
  ToStartDatePicker DatePicker.Msg |
  GotCities (Result Http.Error (List String)) |
  GotEvents (Result Http.Error (List Event)) |
  TimeZoneUpdated Zone |
  CurrentTimeUpdated Posix

type State = Loading | Ready | Error

getCities : Cmd Msg
getCities = Http.get { url = "http://localhost:8080/cities", expect = Http.expectJson GotCities cityDecoder}

cityDecoder : Decoder (List String)
cityDecoder = list JD.string

queryUrl : Model -> String
queryUrl model = 
  let
      freeTextParam = 
        case model.freeText of
            Nothing -> []
            Just freeText -> [U.string "query" freeText]
      cityParam = [U.string "city" model.city]
      fromDateParam = 
        case model.fromDate of
            Nothing -> []
            Just date -> [U.string "fromDate" (Date.toIsoString date)] 

      params = freeTextParam ++ cityParam ++ fromDateParam
  in
  U.crossOrigin 
    "http://localhost:8080" ["search"] params   

getEvents : Model -> Cmd Msg
getEvents model = Http.get { url = queryUrl model, expect = Http.expectJson GotEvents eventListDecoder}

eventListDecoder : Decoder (List Event)
eventListDecoder = list eventDecoder

eventDecoder : Decoder Event
eventDecoder = JD.map6 Event
  (JD.field "title" JD.string)
  (JD.field "description" JD.string)
  (JD.field "location" JD.string)
  (JD.field "source" JD.string)
  (JD.field "startTime" JD.int)
  (JD.field "url" JD.string)

getZone : Cmd Msg
getZone =
    Time.here |> Task.perform TimeZoneUpdated

getTime : Cmd Msg
getTime =
    Time.now |> Task.perform CurrentTimeUpdated

posixTimeToTimeComponentString : Maybe Zone -> Int -> (Zone -> Posix -> Int) -> String
posixTimeToTimeComponentString zone time transformer =
  String.fromInt <| 
    transformer (Maybe.withDefault utc zone) <| millisToPosix time

posixTimeToHebrewMonth : Maybe Zone -> Int -> String
posixTimeToHebrewMonth zone time = 
  let
    month = toMonth (Maybe.withDefault utc zone) <| millisToPosix time
    hebrewMonth = 
      case month of
        Jan -> "ינואר"
        Feb -> "פברואר"
        Mar -> "מרץ"
        Apr -> "אפריל"
        May -> "מאי"
        Jun -> "יוני"
        Jul -> "יולי"
        Aug -> "אוגוסט"
        Sep -> "ספטמבר"
        Oct -> "אוקטובר"
        Nov -> "נובמבר"
        Dec -> "דצמבר"             
  in
    hebrewMonth

formatTime : Maybe Zone -> Int -> String
formatTime zone time = 
  let
    year = posixTimeToTimeComponentString zone time toYear
    month = posixTimeToHebrewMonth zone time
    day = posixTimeToTimeComponentString zone time toDay   
  in
  day ++ " " ++ month ++ ", " ++ year

init : (Model, Cmd Msg)
init = 
  let
      (datePickerFrom, datePickerCmdFrom) = DatePicker.init
      (datePickerTo, datePickerCmdTo) = DatePicker.init
  in
  ({
    freeText = Nothing
    , city = ""
    , fromDatePicker = datePickerFrom
    , fromDate = Nothing   
    , events = []
    , cities = ["All"]
    , state = Loading
    , timeZone = Nothing
  }, Cmd.batch [
        Cmd.map ToStartDatePicker datePickerCmdFrom 
        , getCities 
        , getZone]
  )

visibility : Model -> State -> Attribute msg
visibility model state = 
  if model.state /= state then 
    style "display" "none" 
  else 
    style "" ""

-- View
view : Model -> Html Msg
view model =
    div [] [
       h2 [] [ text "חפש אירועים" ]
       , input [ placeholder "חיפוש חופשי", onInput Change ] []
       , select [] (List.map (\x -> option [value x] [text x])  model.cities)
       , DatePicker.view model.fromDate defaultSettings model.fromDatePicker |> Html.map ToStartDatePicker
       , button [onClick Submit ] [ text "חיפוש" ]
       , div [] [
         p [visibility model Error] [text "ארעה שגיאה"]
         , p [visibility model Loading] [text "טוען..."]
         , table [] [
           thead [] [
             th [] [text "שם"]
             , th [] [text "זמן"]
             , th [] [text "תיאור"]
             , th [] [text "מקור"]             
           ]
           , tbody [] (List.map (\event -> tr [] [
             td [] [a [(href event.url), (title event.description), (target "_blank")] [text event.name]]
             , td [] [text <| formatTime model.timeZone event.time]
             , td [] [text event.location]
             , td [] [text event.source]
           ]) model.events)
         ]
       ]
    ]

-- Update
update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Change str ->
      ({ model | freeText = Just str }, Cmd.none)
    Submit ->          
      ({model | state = Loading}, getEvents model)
    EnterPressed ->
      ({model | state = Loading}, getEvents model)
    ToStartDatePicker subMsg ->
      let
        ( newDatePicker, dateEvent ) =
            DatePicker.update defaultSettings subMsg model.fromDatePicker
        newDate =
            case dateEvent of
                Picked changedDate ->
                    Just changedDate
                _ ->
                    model.fromDate
      in
      ( { model
          | fromDate = newDate
          , fromDatePicker = newDatePicker
        }
      , Cmd.none
      )
    GotCities result ->
      case result of
        Ok cities ->
          ({model | cities = ["All"] ++ cities, state = Ready}, Cmd.none)
        Err _ ->
          ({model | state = Error}, Cmd.none)
    GotEvents result ->
      case result of
          Ok events ->
            ({model | events = events, state = Ready}, Cmd.none)
          Err _ ->                      
            ({model | state = Error}, Cmd.none)
    TimeZoneUpdated zone ->
      ({model | timeZone = Just zone}, getTime)
    CurrentTimeUpdated posixTime ->
      let
        today = fromPosix (Maybe.withDefault utc model.timeZone) posixTime
      in
        ({model | fromDate = Just today}, Cmd.none)
      

              

-- Main
main : Program () Model Msg
main =
    element
        { init = \_ -> init
        , view = view
        , update = update
        , subscriptions = (\_ -> Sub.none)
        }